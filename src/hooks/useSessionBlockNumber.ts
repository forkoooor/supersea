import { useEffect, useState } from 'react'
import blockTimer from '../utils/blockTimer'

const useSessionBlockNumber = () => {
  const [sessionBlockNumber, setSessionBlockNumber] = useState(
    blockTimer.getSessionBlockNumber(),
  )

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      setSessionBlockNumber(e.detail.sessionBlockNumber)
    }) as EventListener

    blockTimer.addEventListener('block', handler)

    return () => {
      blockTimer.removeEventListener('block', handler)
    }
  }, [])

  return sessionBlockNumber
}

export default useSessionBlockNumber
