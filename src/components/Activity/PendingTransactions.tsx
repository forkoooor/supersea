import {
  useColorModeValue,
  HStack,
  Spinner,
  Box,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react'
import _ from 'lodash'
import ReactTimeago from 'react-timeago'
import { PendingTransaction as PendingTransactionType } from '../../hooks/usePendingTransactions'
import { readableGweiValue } from '../../utils/ethereum'

const getWinningTransaction = (
  pendingTransactions: PendingTransactionType[],
) => {
  return _.maxBy(pendingTransactions, 'priorityFee')!
}

const PendingTransactions = ({
  pendingTransactions,
}: {
  pendingTransactions?: PendingTransactionType[]
}) => {
  const pendingBg = useColorModeValue('gray.100', 'gray.600')

  if (!pendingTransactions?.length) return null

  const winningTransaction = getWinningTransaction(pendingTransactions)

  return (
    <Tooltip
      label={
        <Box maxWidth="200px">
          <Text>
            Found {pendingTransactions.length} pending transaction
            {pendingTransactions.length === 1 ? '' : 's'} trying to purchase
            this asset.
          </Text>
          <VStack alignItems="flex-start" spacing="1" mt="2">
            {pendingTransactions
              .sort((a, b) => b.priorityFee - a.priorityFee)
              .map(
                (
                  {
                    priorityFee,
                    maxPriorityFeePerGas,
                    maxFeePerGas,
                    isLegacy,
                    addedAt,
                  },
                  index,
                ) => {
                  return (
                    <Box key={index}>
                      {isLegacy ? (
                        <strong>
                          {readableGweiValue(priorityFee)} (Legacy)
                        </strong>
                      ) : (
                        <strong>
                          {readableGweiValue(maxFeePerGas!)}/
                          {readableGweiValue(maxPriorityFeePerGas!)}
                        </strong>
                      )}

                      <Text
                        as="span"
                        opacity="0.75"
                        ml="2"
                        fontSize="xs"
                        display="inline-block"
                      >
                        <ReactTimeago date={addedAt} />
                      </Text>
                    </Box>
                  )
                },
              )}
          </VStack>
        </Box>
      }
      fontSize="xs"
      hasArrow
      borderRadius="md"
      bg="gray.800"
      placement="top"
      color="white"
      px="3"
      py="2"
    >
      <HStack
        borderRadius="md"
        bg={pendingBg}
        px="2.5"
        py="1"
        spacing="3"
        animation="SuperSea__FadeIn 350ms ease"
      >
        <Box fontSize="xs">
          <Text>{pendingTransactions.length} pending </Text>
          <Text fontWeight="bold">
            {readableGweiValue(winningTransaction.priorityFee)} gwei
            {winningTransaction.isLegacy ? ' (L)' : ''}
            <Spinner width="8px" height="8px" thickness="1px" ml="1" />
          </Text>
        </Box>
      </HStack>
    </Tooltip>
  )
}

export default PendingTransactions
