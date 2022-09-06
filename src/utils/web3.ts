import DataLoader from 'dataloader'
import Web3 from 'web3'
import { RateLimit } from 'async-sema'
import { Transaction } from 'web3-eth/types'

const rateLimit = RateLimit(5)

const web3 = new Web3(
  new Web3.providers.HttpProvider('https://rpc.flashbots.net'),
)

export const fetchMetadataUri = async (address: string, tokenId: number) => {
  const contract = new web3.eth.Contract(
    [
      {
        inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
        name: 'tokenURI',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
    ],
    address,
  )

  return contract.methods.tokenURI(tokenId).call()
}

const sudoswapPoolNftContractAddressLoader = new DataLoader(
  async ([poolAddress]: readonly string[]) => {
    await rateLimit()
    try {
      const poolContract = new web3.eth.Contract(
        [
          {
            inputs: [],
            name: 'nft',
            outputs: [
              {
                internalType: 'contract IERC721',
                name: '_nft',
                type: 'address',
              },
            ],
            stateMutability: 'pure',
            type: 'function',
          },
        ],
        poolAddress,
      )
      const address = await poolContract.methods.nft().call()
      return [address]
    } catch (e) {
      return [null]
    }
  },
  {
    maxBatchSize: 1,
  },
)

export const fetchSudoswapPoolNftContractAddress = (poolAddress: string) => {
  return sudoswapPoolNftContractAddressLoader.load(poolAddress)
}

const transactionLoader = new DataLoader(
  async ([transactionHash]: readonly string[]) => {
    await rateLimit()
    const transaction = web3.eth.getTransaction(transactionHash) as Promise<
      Transaction & {
        maxFeePerGas: string
        maxPriorityFeePerGas: string
      }
    >
    return [transaction]
  },
  {
    maxBatchSize: 1,
  },
)

export const fetchTransaction = (hash: string) => {
  return transactionLoader.load(hash)
}
