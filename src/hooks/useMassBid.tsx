import { useToast } from '@chakra-ui/toast'
import { useEffect, useRef, useState } from 'react'
import Toast from '../components/Toast'
import { Asset, fetchOffers, fetchRemoteConfig } from '../utils/api'
import { MassBidState } from '../components/SearchResults/MassBidStatus'
import { weiToEth } from '../utils/ethereum'

const DEFAULT_MASS_BID_PROCESS: {
  processNumber: number
  processingIndex: number
  retryCount: number
  status: 'idle' | 'processing' | 'stopped'
} = {
  processingIndex: -1,
  processNumber: 0,
  retryCount: 0,
  status: 'idle',
}

const useMassBid = ({
  tokens,
}: {
  tokens: { asset: Asset | null; tokenId: string }[]
}) => {
  const massBidProcessRef = useRef({ ...DEFAULT_MASS_BID_PROCESS })

  const [massBid, setMassBid] = useState<{
    price: number
    expirationTime: number
    skipOnHigherOffer: boolean
    currentIndex: number
  } | null>(null)
  const [massBidStates, setMassBidStates] = useState<
    Record<string, MassBidState>
  >({})

  const toast = useToast()

  useEffect(() => {
    if (
      !massBid ||
      massBidProcessRef.current.processingIndex === massBid.currentIndex ||
      massBidProcessRef.current.status !== 'idle'
    ) {
      return
    }
    massBidProcessRef.current = {
      processNumber: massBidProcessRef.current.processNumber,
      processingIndex: massBid.currentIndex,
      retryCount: massBidProcessRef.current.retryCount,
      status: 'processing',
    }

    const asset = tokens[massBid.currentIndex].asset
    const processNumber = massBidProcessRef.current.processNumber

    // Listen for errors, unsubscribe
    const messageListener = (event: any) => {
      let state: MassBidState | null = null
      let initializeNext = false
      if (event.data.params?.tokenId !== asset!.token_id) {
        return
      }

      if (event.data.method === 'SuperSea__Bid__Error') {
        if (
          /(declined to authorize|user denied message)/i.test(
            event.data.params.error.message,
          )
        ) {
          state = 'SKIPPED'
          initializeNext = true
        } else if (
          /insufficient balance/i.test(event.data.params.error.message)
        ) {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={`You don't have enough WETH to place this bid. Make sure to wrap some first.`}
                type="error"
              />
            ),
          })
          state = 'FAILED'
          massBidProcessRef.current.status = 'stopped'
        } else {
          if (/Trading is not enabled/i.test(event.data.params.error.message)) {
            state = 'FAILED'
            toast({
              duration: 7500,
              position: 'bottom-right',
              render: () => (
                <Toast
                  text={`Asset has been locked from trading, likely due to suspicious activity.`}
                  type="error"
                />
              ),
            })
            initializeNext = true
          } else {
            if (massBidProcessRef.current.retryCount < 3) {
              state = 'RETRYING'
              massBidProcessRef.current.retryCount += 1
              toast({
                duration: 7500,
                position: 'bottom-right',
                render: () => (
                  <Toast
                    text={
                      /Failed to fetch/i.test(event.data.params.error.message)
                        ? "You're getting rate limited by the OpenSea API. Please wait a minute or two before trying again."
                        : `Unable to place bid on item, will try 3 times. Received error "${event.data.params.error.message}"`
                    }
                    type="error"
                  />
                ),
              })
            } else {
              state = 'FAILED'
              initializeNext = true
            }
          }
        }
      } else if (event.data.method === 'SuperSea__Bid__Skipped') {
        state = event.data.params.reason === 'outbid' ? 'OUTBID' : 'SKIPPED'
        initializeNext = true
      } else if (event.data.method === 'SuperSea__Bid__Signed') {
        state = 'SIGNED'
      } else if (event.data.method === 'SuperSea__Bid__Success') {
        state = 'COMPLETED'
        initializeNext = true
      }
      if (!state) return
      if (
        massBid.currentIndex === tokens.length - 1 ||
        massBidProcessRef.current.status === 'stopped' ||
        massBidProcessRef.current.processNumber !== processNumber
      ) {
        initializeNext = false
      }
      if (initializeNext) {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
          [tokens[massBid.currentIndex + 1].tokenId]: 'PROCESSING',
        }))
        massBidProcessRef.current.status = 'idle'
        massBidProcessRef.current.retryCount = 0
        setMassBid({
          ...massBid,
          currentIndex: massBid.currentIndex + 1,
        })
      } else if (
        state === 'RETRYING' &&
        massBidProcessRef.current.status !== 'stopped'
      ) {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
        }))
        massBidProcessRef.current.status = 'idle'
        massBidProcessRef.current.processingIndex = -1
        setMassBid({
          ...massBid,
        })
      } else {
        setMassBidStates((states) => ({
          ...states,
          [event.data.params.tokenId]: state,
        }))
      }
      if (state !== 'SIGNED') {
        window.removeEventListener('message', messageListener)
      }
    }

    ;(async () => {
      let highestOffer = 0

      if (massBid.skipOnHigherOffer) {
        try {
          const res = await fetchOffers(
            asset!.asset_contract.address,
            asset!.token_id,
          )
          highestOffer = [
            ...(res.offers || []),
            ...(res.seaport_offers || []),
          ].reduce((acc: number, { current_price }) => {
            return Math.max(acc, weiToEth(Number(current_price)))
          }, 0)
        } catch (e) {}
      }
      const config = await fetchRemoteConfig()
      window.addEventListener('message', messageListener)
      window.postMessage({
        method: 'SuperSea__Bid',
        params: {
          asset,
          highestOffer,
          apiKey: config.queryHeaders['x-api-key'],
          tokenId: asset?.token_id,
          address: asset?.asset_contract.address,
          price: massBid.price,
          expirationTime: massBid.expirationTime,
        },
      })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [massBid, tokens])

  return {
    massBidStates,
    isMassBidding: Boolean(massBid),
    startMassBid: ({
      price,
      expirationTime,
      skipOnHigherOffer,
    }: {
      price: number
      expirationTime: number
      skipOnHigherOffer: boolean
    }) => {
      massBidProcessRef.current = {
        processingIndex: -1,
        processNumber: massBidProcessRef.current.processNumber + 1,
        retryCount: 0,
        status: 'idle',
      }
      setMassBidStates({
        [tokens[0].tokenId]: 'PROCESSING',
      })
      setMassBid({
        price,
        skipOnHigherOffer,
        expirationTime,
        currentIndex: 0,
      })
    },
    stopMassBid: () => {
      massBidProcessRef.current.status = 'stopped'
      setMassBid(null)
    },
    clearMassBid: () => {
      setMassBid(null)
      setMassBidStates({})
      massBidProcessRef.current = { ...DEFAULT_MASS_BID_PROCESS }
    },
  }
}

export default useMassBid
