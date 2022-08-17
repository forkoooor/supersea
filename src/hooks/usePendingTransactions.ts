import { Alchemy } from 'alchemy-sdk'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { fetchAlchemyKey } from '../utils/api'
import { useUser } from '../utils/user'
import { Sale } from './useActivity'

const CONTRACT_ADDRESS = '0x00000000006c3852cbef3e08e8df289169ede581'

export type PendingTransaction = {
  hash: string
  fromAddress: string
  priorityFee: number
  maxPriorityFeePerGas: number | null
  maxFeePerGas: number | null
  isLegacy: boolean
  contractAddress: string
  tokenId: string
  addedAt: number
}

export const getPendingTransactionsForCollection = ({
  collectionContractAddress,
  pendingTransactionRecord,
  saleRecord,
}: {
  collectionContractAddress: string
  pendingTransactionRecord: Record<string, PendingTransaction[]>
  saleRecord: Record<string, Sale>
}): PendingTransaction[] => {
  const pendingTransactions =
    Object.values(pendingTransactionRecord).flat() || []
  const groupedSales = _.groupBy(
    Object.values(saleRecord),
    ({ contractAddress, tokenId }) => `${contractAddress}:${tokenId}`,
  )
  return pendingTransactions.filter(({ contractAddress, tokenId, addedAt }) => {
    const sales = groupedSales[`${contractAddress}:${tokenId}`] || []
    const hasSoldAfter = sales.some(({ timestamp }) => timestamp > addedAt)
    return contractAddress === collectionContractAddress && !hasSoldAfter
  })
}

const usePendingTransactions = ({
  contractAddressMap,
}: {
  contractAddressMap: Record<string, boolean>
}) => {
  const [alchemyClient, setAlchemyClient] = useState<Alchemy | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const user = useUser()
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([])

  const contractAddressesKey = Object.keys(contractAddressMap).sort().join(',')

  useEffect(() => {
    if (
      contractAddressesKey &&
      !alchemyClient &&
      !hasInitialized &&
      user?.isSubscriber
    ) {
      ;(async () => {
        setHasInitialized(true)
        const apiKey = await fetchAlchemyKey()
        if (apiKey) {
          setAlchemyClient(new Alchemy({ apiKey }))
        }
      })()
    }
  }, [alchemyClient, hasInitialized, contractAddressesKey, user])

  useEffect(() => {
    if (!alchemyClient) return
    alchemyClient.ws.removeAllListeners()
    if (contractAddressesKey) {
      alchemyClient.ws.on(
        {
          method: 'alchemy_pendingTransactions',
          toAddress: CONTRACT_ADDRESS,
        },
        ({
          hash,
          input,
          from,
          gasPrice: _gasPrice,
          maxFeePerGas: _maxFeePerGas,
          maxPriorityFeePerGas: _maxPriorityFeePerGas,
        }) => {
          if (!input.startsWith('0xfb0f3ee1')) return
          const split = input.slice(10).match(/.{1,64}/g) as string[]
          const [_contractAddress, _tokenId] = split.slice(6)
          const contractAddress = `0x${_contractAddress.slice(-40)}`
          const tokenId = String(parseInt(_tokenId, 16))

          if (!contractAddressMap[contractAddress]) return

          const gasPrice = parseInt(_gasPrice, 16)
          const maxFeePerGas = parseInt(_maxFeePerGas, 16)
          const maxPriorityFeePerGas = parseInt(_maxPriorityFeePerGas, 16)
          const priorityFee = maxPriorityFeePerGas
            ? Math.min(maxFeePerGas, maxPriorityFeePerGas)
            : gasPrice

          setPendingTransactions((list) => {
            return list
              .concat([
                {
                  hash,
                  fromAddress: from,
                  priorityFee,
                  maxFeePerGas,
                  maxPriorityFeePerGas,
                  isLegacy: !maxPriorityFeePerGas,
                  contractAddress,
                  tokenId,
                  addedAt: Date.now(),
                },
              ])
              .filter(({ addedAt }) => {
                return Date.now() - addedAt < 1000 * 60
              })
          })
        },
      )
    }

    return () => {
      alchemyClient.ws.removeAllListeners()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alchemyClient, contractAddressesKey])

  return _.groupBy(pendingTransactions, ({ contractAddress, tokenId }) => {
    return `${contractAddress}:${tokenId}`
  })
}

export default usePendingTransactions
