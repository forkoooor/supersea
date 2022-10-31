import { Text, HStack, Box } from '@chakra-ui/react'
import _ from 'lodash'
import { PendingTransaction } from '../../hooks/usePendingTransactions'
import { SentTransaction } from '../../utils/quickBuy'
import PendingTransactions from './PendingTransactions'

const TransactionTracker = ({
  sentTransactions,
  pendingTransactionRecord,
}: {
  sentTransactions: SentTransaction[]
  pendingTransactionRecord: Record<string, PendingTransaction[]>
}) => {
  const grouped = _.groupBy(
    sentTransactions,
    ({ asset }) => `${asset.contractAddress}:${asset.tokenId}`,
  )

  const entries = Object.entries(grouped)
  return (
    <HStack
      spacing="3"
      height="100%"
      opacity={entries.length ? 1 : 0}
      transition="opacity 250ms ease"
    >
      <Text fontSize="sm" opacity="0.65" flexShrink={0}>
        Your transactions:
      </Text>
      <HStack overflow="auto">
        {entries.map(([key, sentTransactions]) => {
          return (
            <Box key={key} flexShrink={0}>
              <PendingTransactions
                pendingTransactions={pendingTransactionRecord[key]}
                sentTransactions={sentTransactions}
                assetMetadata={sentTransactions[0].asset}
                variant="transactionList"
              />
            </Box>
          )
        })}
      </HStack>
    </HStack>
  )
}

export default TransactionTracker
