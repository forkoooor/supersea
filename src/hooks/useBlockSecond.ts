import { useEffect, useState } from 'react'
import blockTimer from '../utils/blockTimer'

const useBlockSecond = () => {
  const [blockSecond, setBlockSecond] = useState(blockTimer.getBlockSecond())

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      setBlockSecond(e.detail.blockSecond)
    }) as EventListener

    blockTimer.addEventListener('second', handler)

    return () => {
      blockTimer.removeEventListener('second', handler)
    }
  }, [])

  return blockSecond
}

export default useBlockSecond
