import { useContext, useEffect, useState } from 'react'
import { EventEmitterContext } from '../components/AppProvider'
import { SentTransaction, sentTransactions } from '../utils/quickBuy'

const useSentTransactions = () => {
  const [sentTransactionsState, setSentTransactionsState] = useState<
    SentTransaction[]
  >([])
  const events = useContext(EventEmitterContext)
  useEffect(() => {
    const listener = () => {
      setSentTransactionsState(sentTransactions)
    }
    events.addListener('sentTransactionsUpdated', listener)
    return () => {
      events.removeListener('sentTransactionsUpdated', listener)
    }
  }, [events])

  return sentTransactionsState
}

export default useSentTransactions
