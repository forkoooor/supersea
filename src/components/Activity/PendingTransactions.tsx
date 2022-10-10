import {
  useColorModeValue,
  HStack,
  Spinner,
  Box,
  Text,
  Tooltip,
  Image,
  VStack,
  Flex,
  useToast,
} from '@chakra-ui/react'
import _ from 'lodash'
import { PendingTransaction as PendingTransactionType } from '../../hooks/usePendingTransactions'
import useSessionBlockNumber from '../../hooks/useSessionBlockNumber'
import { readableGweiValue, weiToGwei } from '../../utils/ethereum'
import { useExtensionConfig } from '../../utils/extensionConfig'
import { SentTransaction, triggerQuickBuy } from '../AssetInfo/BuyNowButton'

const PendingTransactions = ({
  pendingTransactions,
  sentTransactions,
  variant = 'activityList',
}: {
  pendingTransactions?: PendingTransactionType[]
  sentTransactions: SentTransaction[]
  variant?: 'activityList' | 'transactionList'
}) => {
  const toast = useToast()
  const sessionBlockNumber = useSessionBlockNumber()
  const pendingBg = useColorModeValue('gray.100', 'gray.600')
  const imageBg = useColorModeValue('blackAlpha.100', 'blackAlpha.200')
  const [config] = useExtensionConfig()

  if (!pendingTransactions?.length) return null

  const mergedPending = pendingTransactions
    .filter(
      (pending) => !sentTransactions.find((sent) => sent.hash === pending.hash),
    )
    .concat(
      sentTransactions.map((sentTransaction) => {
        const sentPending = pendingTransactions.find(
          (pending) => pending.hash === sentTransaction.hash,
        )
        return {
          hash: sentTransaction.hash,
          priorityFee:
            sentPending?.priorityFee ||
            sentTransaction.maxPriorityFeePerGas ||
            0,
          maxFeePerGas:
            sentPending?.maxFeePerGas || sentTransaction.priorityFee || 0,
          maxPriorityFeePerGas:
            sentPending?.maxPriorityFeePerGas ||
            sentTransaction.maxPriorityFeePerGas ||
            0,
          addedAt: sentTransaction.addedAt,
          contractAddress: sentTransaction.asset.contractAddress,
          fromAddress: 'SELF',
          tokenId: sentTransaction.asset.tokenId,
          sessionBlockNumber: sentTransaction.sessionBlockNumber,
        }
      }),
    )
    .sort((a, b) => {
      if (a.sessionBlockNumber === b.sessionBlockNumber)
        return b.priorityFee - a.priorityFee
      return a.sessionBlockNumber - b.sessionBlockNumber
    })

  const highestPriority = _.maxBy(mergedPending, 'priorityFee')!

  const canQuickBuy =
    true || (config?.quickBuyEnabled && highestPriority.fromAddress !== 'SELF')

  const minPendingSessionBlockNumber = Math.min(
    ...mergedPending.map((p) => p.sessionBlockNumber),
  )

  const blocksLate = sessionBlockNumber - minPendingSessionBlockNumber

  return (
    <Tooltip
      label={
        <Box maxWidth="200px">
          <Text>
            Found {mergedPending.length} pending transaction
            {mergedPending.length === 1 ? '' : 's'} with the following gas bids:
          </Text>
          <VStack alignItems="flex-start" spacing="1" mt="2">
            {mergedPending.map(
              (
                {
                  priorityFee,
                  maxPriorityFeePerGas,
                  maxFeePerGas,
                  fromAddress,
                  sessionBlockNumber: txSessionBlockNumber,
                  hash,
                },
                index,
              ) => {
                const blockAge = sessionBlockNumber - txSessionBlockNumber
                const blocksLate =
                  txSessionBlockNumber - minPendingSessionBlockNumber
                return (
                  <Box width="100%" key={hash}>
                    <Flex>
                      <Box>
                        {maxFeePerGas === null ? (
                          <strong>
                            {readableGweiValue(priorityFee)} (Legacy)
                          </strong>
                        ) : (
                          <strong>
                            {maxFeePerGas
                              ? readableGweiValue(maxFeePerGas)
                              : '?'}
                            /
                            {maxPriorityFeePerGas
                              ? readableGweiValue(maxPriorityFeePerGas)
                              : '?'}
                          </strong>
                        )}
                      </Box>
                      {fromAddress === 'SELF' ? (
                        <Text
                          as="span"
                          color="blue.400"
                          fontWeight="bold"
                          mx="1"
                        >
                          You
                        </Text>
                      ) : null}
                    </Flex>
                    <Text
                      as="span"
                      fontSize="xs"
                      display="inline-block"
                      color="gray.400"
                    >
                      {blockAge <= 0
                        ? 'Current block slot'
                        : `${blockAge} block slot${
                            blockAge === 1 ? '' : 's'
                          } ago`}
                      {blocksLate ? (
                        <Text as="span" color="red.300">
                          {' '}
                          ({blocksLate} slot{blocksLate === 1 ? '' : 's'} late)
                        </Text>
                      ) : null}
                    </Text>
                  </Box>
                )
              },
            )}
          </VStack>
          {canQuickBuy ? (
            <Text pt="3" fontWeight="bold">
              Click to outbid top gas by 10%
              {blocksLate ? (
                <Text as="span" color="red.300">
                  <br />({blocksLate} slot{blocksLate === 1 ? '' : 's'} late)
                </Text>
              ) : null}
            </Text>
          ) : null}
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
      <Box
        cursor="pointer"
        onClick={() => {
          if (!canQuickBuy) return

          triggerQuickBuy({
            isFounder: false, // Doesn't matter when there's a gas override
            toast,
            address: highestPriority.contractAddress,
            tokenId: highestPriority.tokenId,
            onComplete: () => {},
            gasOverride: {
              fee: weiToGwei(
                (highestPriority.maxFeePerGas || highestPriority.priorityFee) *
                  1.1,
              ),
              priorityFee: weiToGwei(
                (highestPriority.maxPriorityFeePerGas ||
                  highestPriority.priorityFee) * 1.1,
              ),
            },
          })
        }}
      >
        {variant === 'activityList' ? (
          <HStack
            borderRadius="md"
            bg={pendingBg}
            px="2.5"
            py="1"
            spacing="3"
            animation="SuperSea__FadeIn 350ms ease"
          >
            <Box fontSize="xs">
              <Text>{mergedPending.length} pending</Text>
              <Text fontWeight="bold">
                {readableGweiValue(highestPriority.priorityFee)} gwei
                <Spinner width="8px" height="8px" thickness="1px" ml="1" />
              </Text>
            </Box>
          </HStack>
        ) : (
          <HStack
            fontSize="11px"
            borderRadius="md"
            py="1"
            px="2"
            bg={pendingBg}
          >
            <Box width="24px" height="24px" borderRadius="md" bg={imageBg}>
              {sentTransactions![0].asset.image ? (
                <Image
                  src={sentTransactions![0].asset.image}
                  width="24px"
                  height="24px"
                  borderRadius="md"
                />
              ) : null}
            </Box>
            <Box spacing="0">
              <Text>{sentTransactions![0].asset.name}</Text>
              <HStack
                divider={<Box width="1px" height="10px" bg="black" />}
                spacing="1"
              >
                <Text>{mergedPending.length} pend</Text>
                <Text fontWeight="bold">
                  {readableGweiValue(highestPriority.priorityFee)} gwei
                </Text>
              </HStack>
            </Box>
            <Spinner width="10px" height="10px" thickness="1px" />
          </HStack>
        )}
      </Box>
    </Tooltip>
  )
}

export default PendingTransactions
