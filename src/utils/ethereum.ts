const WEI_PER_ETH = Math.pow(10, 18)
const WEI_PER_GWEI = Math.pow(10, 9)

export const weiToEth = (wei: number) => {
  return wei / WEI_PER_ETH
}

export const ethToWei = (eth: number) => {
  return eth * WEI_PER_ETH
}

export const weiToGwei = (wei: number) => {
  return wei / WEI_PER_GWEI
}

export const gweiToWei = (gwei: number) => {
  return gwei * WEI_PER_GWEI
}

export const readableEthValue = (wei: number) => {
  return Math.round(weiToEth(wei) * 1000) / 1000
}

export const readableGweiValue = (wei: number) => {
  return Math.round(weiToGwei(wei) * 10) / 10
}
