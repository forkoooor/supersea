import { useToast } from '@chakra-ui/react'
import Toast from '../components/Toast'
import { getExtensionConfig } from './extensionConfig'
import { fetchListings, fetchOptimalGasPreset } from './api'
import { getCheapestListing } from './orders'
import EventEmitter from 'events'
import blockTimer from './blockTimer'
import { gweiToWei } from './ethereum'

export type SentTransaction = {
  hash: string
  addedAt: number
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'DENIED'
  updatedAt: number
  asset: {
    contractAddress: string
    tokenId: string
    name: string
    image: string
  }
  priorityFee: number | null
  maxPriorityFeePerGas: number | null
  sessionBlockNumber: number
}

export const sentTransactions: SentTransaction[] = []

const readableError = (message: string) => {
  if (/insufficient funds/.test(message)) {
    return 'You do not have enough funds to buy this asset.'
  } else if (/cancelled due to price change/.test(message)) {
    return message
  }
  return `Unable to buy item. Received error "${message}"`
}

export const quickBuy = async ({
  isFounder,
  toast,
  events,
  address,
  tokenId,
  assetMetadata,
  displayedPrice,
  gasOverride,
  onComplete,
}: {
  isFounder: boolean
  toast: ReturnType<typeof useToast>
  events: EventEmitter
  address: string
  tokenId: string
  assetMetadata?: { name: string; image: string }
  displayedPrice?: string
  gasOverride?: null | { fee: number; priorityFee: number }
  onComplete: () => void
}) => {
  const [
    { listings: wyvern_listings, seaport_listings },
    gasPreset,
  ] = await Promise.all([
    fetchListings(address, tokenId).catch((e) => {
      return {}
    }),
    (async () => {
      if (gasOverride) return gasOverride
      const config = await getExtensionConfig(false)
      if (config.quickBuyGasPreset === 'fixed') {
        return config.fixedGas
      } else if (config.quickBuyGasPreset === 'optimal' && isFounder) {
        try {
          const optimalGasPreset = await fetchOptimalGasPreset()
          return optimalGasPreset
        } catch (err) {
          console.error(err)
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={
                  'Unable to load optimal gas settings, using MetaMask defaults.'
                }
                type="error"
              />
            ),
          })
          return null
        }
      }
      return null
    })(),
  ])

  const cheapest = getCheapestListing(wyvern_listings, seaport_listings)
  if (!cheapest) {
    toast({
      duration: 7500,
      position: 'bottom-right',
      render: () => (
        <Toast text={'Unable to get asset listing.'} type="error" />
      ),
    })
    onComplete()
    return
  }

  window.postMessage({
    method: 'SuperSea__Buy',
    params: {
      order: cheapest,
      tokenId,
      address,
      gasPreset,
      displayedPrice,
    },
  })
  // Listen for errors, unsubscribe
  const messageListener = (event: any) => {
    if (
      event.data.method === 'SuperSea__Buy__Error' &&
      event.data.params.tokenId === tokenId &&
      event.data.params.address === address
    ) {
      if (event.data.params.error) {
        if (!/user denied/i.test(event.data.params.error.message)) {
          toast({
            duration: 7500,
            position: 'bottom-right',
            render: () => (
              <Toast
                text={readableError(event.data.params.error.message)}
                type="error"
              />
            ),
          })
        }
        window.removeEventListener('message', messageListener)
        onComplete()
      }
      if (event.data.params.transactionHash) {
        const sent = sentTransactions.find(
          (t) => t.hash === event.data.params.transactionHash,
        )
        if (sent) {
          sent.status = 'FAILED'
        }
        events.emit('sentTransactionsUpdated')
      }
    } else if (
      event.data.method === 'SuperSea__Buy__Sent' &&
      event.data.params.tokenId === tokenId &&
      event.data.params.address === address
    ) {
      if (assetMetadata) {
        sentTransactions.push({
          addedAt: Date.now(),
          asset: {
            contractAddress: address,
            tokenId,
            ...assetMetadata,
          },
          hash: event.data.params.transactionHash,
          maxPriorityFeePerGas: gweiToWei(gasPreset.priorityFee),
          priorityFee: gweiToWei(gasPreset.fee),
          updatedAt: Date.now(),
          sessionBlockNumber: blockTimer.getSessionBlockNumber(),
          status: 'PENDING',
        })
      }
      events.emit('sentTransactionsUpdated')
      setTimeout(() => {
        const index = sentTransactions.findIndex(
          (t) => t.hash === event.data.params.transactionHash,
        )
        sentTransactions.splice(index, 1)
        events.emit('sentTransactionsUpdated')
      }, 120 * 1000)
    } else if (
      event.data.method === 'SuperSea__Buy__Success' &&
      event.data.params.tokenId === tokenId &&
      event.data.params.address === address
    ) {
      window.removeEventListener('message', messageListener)
      const sent = sentTransactions.find(
        (t) => t.hash === event.data.params.transactionHash,
      )
      if (sent) {
        sent.status = 'CONFIRMED'
      }
      events.emit('sentTransactionsUpdated')
      onComplete()
    }
  }

  window.addEventListener('message', messageListener)
}
