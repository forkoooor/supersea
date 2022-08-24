import _ from 'lodash'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getUser } from '../utils/api'
import { useUser } from '../utils/user'
import { Sale } from './useActivity'
import { io, Socket } from 'socket.io-client'

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
  active,
}: {
  contractAddressMap: Record<string, boolean>
  active: boolean
}) => {
  const visbilityTimeout = useRef<NodeJS.Timeout | null>(null)
  const [isIdle, setIsIdle] = useState(false)
  const debouncedSetIdle = useMemo(
    () => _.debounce(() => setIsIdle(true), 5 * 60 * 1000),
    [setIsIdle],
  )
  const [socketClient, setSocketClient] = useState<Socket | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const user = useUser()
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([])

  const contractAddressesKey = Object.keys(contractAddressMap).sort().join(',')

  useEffect(() => {
    const mouseListener = () => {
      debouncedSetIdle()
      if (isIdle) {
        setIsIdle(false)
      }
    }
    const visibilityListener = () => {
      if (visbilityTimeout.current !== null) {
        clearTimeout(visbilityTimeout.current)
      }
      if (document.visibilityState === 'hidden') {
        visbilityTimeout.current = setTimeout(() => {
          setIsIdle(true)
        }, 10 * 1000)
      } else {
        debouncedSetIdle()
        if (isIdle) {
          setIsIdle(false)
        }
      }
    }
    document.addEventListener('visibilitychange', visibilityListener)
    document.addEventListener('mousemove', mouseListener)
    return () => {
      document.removeEventListener('visibilitychange', visibilityListener)
      document.removeEventListener('mousemove', mouseListener)
    }
  }, [isIdle, debouncedSetIdle])

  useEffect(() => {
    return () => {}
  }, [isIdle, debouncedSetIdle])

  const shouldSubscribe = active && !isIdle

  useEffect(() => {
    if (
      contractAddressesKey &&
      !socketClient &&
      !hasInitialized &&
      user?.isSubscriber
    ) {
      ;(async () => {
        setHasInitialized(true)
        const user = await getUser()
        if (user?.accessToken) {
          const socket = io('https://pending.nonfungible.tools', {
            auth: {
              token: user.accessToken,
            },
          })
          socket.once('connect', () => {
            setSocketClient(socket)
          })
        }
      })()
    }
  }, [socketClient, hasInitialized, contractAddressesKey, user])

  useEffect(() => {
    if (!socketClient) return
    socketClient.off('pendingTransaction')
    if (!shouldSubscribe && socketClient.connected) {
      socketClient.disconnect()
      return
    }
    if (shouldSubscribe && socketClient.disconnected) {
      socketClient.connect()
    }
    if (contractAddressesKey && shouldSubscribe) {
      socketClient.on('pendingTransaction', (pendingTransaction) => {
        if (!contractAddressMap[pendingTransaction.contractAddress]) return

        setPendingTransactions((list) => {
          return list
            .concat([
              {
                ...pendingTransaction,
                addedAt: Date.now(),
              },
            ])
            .filter(({ addedAt }) => {
              return Date.now() - addedAt < 1000 * 60
            })
        })
      })
    }

    return () => {
      socketClient.off('pendingTransaction')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldSubscribe, socketClient, contractAddressesKey])

  return _.groupBy(pendingTransactions, ({ contractAddress, tokenId }) => {
    return `${contractAddress}:${tokenId}`
  })
}

export default usePendingTransactions
