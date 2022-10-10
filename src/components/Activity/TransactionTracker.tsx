import { Text, HStack, Box } from '@chakra-ui/react'
import _ from 'lodash'
import { PendingTransaction } from '../../hooks/usePendingTransactions'
import { SentTransaction } from '../AssetInfo/BuyNowButton'
import PendingTransactions from './PendingTransactions'

const TransactionTracker = ({
  sentTransactionRecord,
  pendingTransactionRecord,
}: {
  sentTransactionRecord: Record<string, SentTransaction>
  pendingTransactionRecord: Record<string, PendingTransaction[]>
}) => {
  const grouped = _.groupBy(
    Object.values(sentTransactionRecord),
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
        {Object.entries(grouped).map(([key, sentTransactions]) => {
          return (
            <Box key={key} flexShrink={0}>
              <PendingTransactions
                pendingTransactions={pendingTransactionRecord[key]}
                sentTransactions={sentTransactions}
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
