import _ from 'lodash'
import { useEffect, useRef, useState } from 'react'
import { Event } from '../components/Activity/ActivityEvent'
import { fetchOpenSeaGraphQL, fetchRemoteConfig } from '../utils/api'
import { ethToWei } from '../utils/ethereum'
import { useExtensionConfig } from '../utils/extensionConfig'
import openseaStream from '../utils/openseaStream'

export type PollStatus =
  | 'INACTIVE'
  | 'STARTING'
  | 'ACTIVE'
  | 'RATE_LIMITED'
  | 'STREAMING'
export type ActivityFilter = 'ALL' | 'CREATED' | 'SUCCESSFUL' | 'NONE'
export type Sale = {
  hash: string | null
  timestamp: number
  tokenId: string
  contractAddress: string
  chain: string
}

let seen: Record<string, boolean> = {}
let consecutiveRateLimits = 0

// Get a time 60 seconds before the given time, but no earlier than the minimum
const getBufferedTime = (time: string, minimum: string) => {
  const date = new Date(new Date(time + 'Z').getTime() - 60 * 1000)
  if (date.getTime() < new Date(minimum + 'Z').getTime()) {
    return minimum
  }
  return date.toISOString().replace('Z', '')
}

let cachedStatus: PollStatus = 'INACTIVE'
let cachedEvents: Event[] = []
let cachedListingEvents: Event[] = []
let cachedSaleEvents: Event[] = []
let cachedPollTimestamp = '2021-01-01T00:00:00'

const useActivity = ({
  collectionSlugs,
  pollInterval,
  filter,
}: {
  collectionSlugs: string[]
  pollInterval: number
  filter: ActivityFilter
}) => {
  const [events, setEvents] = useState<Event[]>(cachedEvents)
  const [listingEvents, setListingEvents] = useState<Event[]>(
    cachedListingEvents,
  )
  const [saleEvents, setSaleEvents] = useState<Event[]>(cachedSaleEvents)
  const saleRecord = useRef<Record<string, Sale>>({}).current

  const [status, setStatus] = useState<PollStatus>(cachedStatus)
  const collectionSlugsKey = collectionSlugs.join(',')
  const prevCollectionSlugsKey = useRef<string>(collectionSlugsKey)
  const pollTimestampRef = useRef(cachedPollTimestamp)
  const initialPollTimeRef = useRef(cachedPollTimestamp)
  const pollIndexRef = useRef(0)

  const [extensionConfig] = useExtensionConfig()

  useEffect(() => {
    cachedEvents = events
    cachedStatus = status
    cachedListingEvents = listingEvents
    cachedSaleEvents = saleEvents
  }, [status, events, saleEvents, listingEvents])

  // Polling
  useEffect(() => {
    if (extensionConfig === null || extensionConfig.useStreamClient) return

    let isInitialFetch = prevCollectionSlugsKey.current !== collectionSlugsKey
    prevCollectionSlugsKey.current = collectionSlugsKey

    if (collectionSlugs.length === 0) {
      setStatus('INACTIVE')
      return
    } else if (isInitialFetch) {
      setStatus('STARTING')
    }
    pollIndexRef.current += 1
    let timeout: NodeJS.Timeout

    const updateActivity = async () => {
      const pollIndex = pollIndexRef.current

      const fetchStartTime = Date.now()
      const remoteConfig = await fetchRemoteConfig()
      try {
        const json = isInitialFetch
          ? await fetchOpenSeaGraphQL('EventHistoryQuery', {
              variables: {
                collectionSlugs,
                count: 1,
              },
            })
          : await fetchOpenSeaGraphQL('EventHistoryPollQuery', {
              variables: {
                collectionSlugs,
                timestamp: getBufferedTime(
                  pollTimestampRef.current,
                  initialPollTimeRef.current,
                ),
                count: 50,
              },
            })

        if (pollIndex !== pollIndexRef.current) return
        const paths = remoteConfig.queries['EventHistoryPollQuery'].resultPaths
        const allEvents = _.get(json, paths.edges)

        if (allEvents.length) {
          pollTimestampRef.current = _.get(allEvents[0], paths.timestamp)
          if (isInitialFetch) {
            initialPollTimeRef.current = pollTimestampRef.current
          }
        }

        const events = _.get(json, paths.edges)
          .map((edge: any) => {
            if (!_.get(edge, paths.asset)) return null
            const chain = _.get(edge, paths.chain)
            const id = _.get(edge, paths.listingId)
            const eventType = _.get(edge, paths.eventType)
            const timestamp = _.get(edge, paths.timestamp)
            return {
              listingId: `${eventType}:${id}:${timestamp}`,
              tokenId: _.get(edge, paths.tokenId),
              contractAddress: _.get(edge, paths.contractAddress),
              chain: chain === 'MATIC' ? 'polygon' : 'ethereum',
              name: _.get(edge, paths.name) || `#${_.get(edge, paths.tokenId)}`,
              image: _.get(edge, paths.image),
              price: remoteConfig.queries['EventHistoryPollQuery'].priceInEth
                ? ethToWei(+_.get(edge, paths.price))
                : _.get(edge, paths.price),
              currency: _.get(edge, paths.currency),
              sellerAddress: _.get(edge, paths.sellerAddress),
              blockExplorerLink: _.get(edge, paths.blockExplorerLink),
              timestamp,
              eventType,
            }
          })
          .filter(Boolean)
        if (isInitialFetch) {
          isInitialFetch = false
          setStatus('ACTIVE')
        } else {
          if (events.length) {
            setEvents((e) => {
              e.forEach((event) => {
                seen[event.listingId] = true
              })
              const unique = (events as Event[]).filter((event) => {
                if (seen[event.listingId]) return false
                return true
              })
              return [...unique, ...e].slice(0, 50)
            })

            setListingEvents((e) => {
              const unique = (events as Event[]).filter((event) => {
                if (seen[event.listingId]) return false
                if (event.eventType !== 'CREATED') return false
                return true
              })
              return [...unique, ...e].slice(0, 50)
            })

            setSaleEvents((e) => {
              const unique = (events as Event[]).filter((event) => {
                if (seen[event.listingId]) return false
                if (event.eventType === 'CREATED') return false
                return true
              })
              return [...unique, ...e].slice(0, 50)
            })
          }
        }

        cachedPollTimestamp = pollTimestampRef.current

        const fetchDuration = Date.now() - fetchStartTime
        consecutiveRateLimits = 0
        timeout = setTimeout(
          updateActivity,
          Math.max(0, pollInterval * 1000 - fetchDuration),
        )
      } catch (e) {
        console.error(e)
        if (pollIndex !== pollIndexRef.current) return
        setStatus('RATE_LIMITED')
        consecutiveRateLimits++
        timeout = setTimeout(() => {
          setStatus('ACTIVE')
          updateActivity()
        }, 5000 * consecutiveRateLimits)
      }
    }

    updateActivity()

    return () => {
      pollIndexRef.current++
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionSlugsKey, pollInterval, extensionConfig?.useStreamClient])

  // Streaming
  useEffect(() => {
    if (extensionConfig === null || !extensionConfig.useStreamClient) return
    if (collectionSlugs.length === 0) {
      setStatus('INACTIVE')
    } else {
      setStatus('STREAMING')
    }

    const syncEventsState = () => {
      setEvents(openseaStream.getEvents('ALL'))
      setListingEvents(openseaStream.getEvents('CREATED'))
      setSaleEvents(openseaStream.getEvents('SUCCESSFUL'))
    }

    syncEventsState()

    openseaStream.syncActiveStreams(collectionSlugs)
    openseaStream.addEventListener('eventAdded', syncEventsState)

    return () => {
      openseaStream.removeEventListener('eventAdded', syncEventsState)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionSlugsKey, extensionConfig?.useStreamClient])

  events.forEach((event) => {
    if (event.eventType === 'SUCCESSFUL') {
      const key = `${event.sellerAddress}:${event.contractAddress}:${event.tokenId}`
      saleRecord[key] = {
        chain: event.chain,
        tokenId: event.tokenId,
        contractAddress: event.contractAddress,
        hash: event.blockExplorerLink
          ? event.blockExplorerLink.split('/').pop() || null
          : null,
        timestamp: +new Date(event.timestamp),
      }
    }
  })

  return {
    events,
    saleRecord,
    filteredEvents: (() => {
      if (filter === 'CREATED') return listingEvents
      if (filter === 'SUCCESSFUL') return saleEvents
      return events
    })(),
    status,
  }
}

export default useActivity
