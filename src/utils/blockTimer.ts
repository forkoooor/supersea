class BlockTimer extends EventTarget {
  private sessionBlockNumber: number = 0
  private blockSecond: number = 0

  constructor() {
    super()
    this.tick()
  }

  tick() {
    const currentSecond = Math.floor(Date.now() / 1000)
    this.blockSecond = (currentSecond + 1) % 12 // Blocks process at seconds 11, 23, 35, 47, 59

    if (this.blockSecond === 0) {
      this.sessionBlockNumber++
      this.dispatchEvent(
        new CustomEvent('block', {
          detail: { sessionBlockNumber: this.sessionBlockNumber },
        }),
      )
    }
    this.dispatchEvent(
      new CustomEvent('second', { detail: { blockSecond: this.blockSecond } }),
    )

    const now = Date.now()
    const msToNextSecond = Math.ceil(now / 1000) * 1000 - now
    setTimeout(() => {
      this.tick()
    }, msToNextSecond + 25)
  }

  getSessionBlockNumber() {
    return this.sessionBlockNumber
  }

  getBlockSecond() {
    return this.blockSecond
  }
}

export default new BlockTimer()
