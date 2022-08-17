import { useState } from 'react'
import {
  HStack,
  VStack,
  Image,
  Text,
  Box,
  Table,
  Tbody,
  Tr,
  Td,
  Flex,
  Spinner,
  Tooltip,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react'
import useFloor from '../../hooks/useFloor'
import _ from 'lodash'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { SmallCloseIcon } from '@chakra-ui/icons'
import { Trait } from '../../utils/api'
import InternalLink from '../InternalLink'
import { PendingTransaction } from '../../hooks/usePendingTransactions'

export type Collection = {
  name: string
  imageUrl: string
  slug: string
  contractAddress: string
  rarities: {
    tokenRank: Record<string, number>
    noTraitCountTokenRank: Record<string, number>
    tokenCount: number
    isRanked: boolean
    traits: Trait[]
  }
}

const WatchedCollection = ({
  collection,
  pendingTransactions,
  onRemove,
}: {
  collection: Collection
  pendingTransactions: PendingTransaction[]
  onRemove: () => void
}) => {
  const {
    floor,
    loading: floorLoading,
    loadedAt: floorLoadedAt,
    forceReload: forceReloadFloor,
  } = useFloor(collection.slug)
  const [floorTooltipOpen, setFloorTooltipOpen] = useState(false)

  return (
    <HStack
      spacing="1"
      width="100%"
      justifyContent="space-between"
      alignItems="center"
      bg={useColorModeValue('gray.100', 'blackAlpha.400')}
      p="2"
      pr="1"
      borderRadius="md"
    >
      <HStack spacing="3">
        <Image
          src={collection.imageUrl}
          width="48px"
          height="48px"
          borderRadius="md"
        />
        <Box>
          <InternalLink
            route="collection"
            params={{
              collectionSlug: collection.slug,
            }}
            my="0"
            fontSize="sm"
            fontWeight="500"
          >
            {collection.name}
          </InternalLink>
        </Box>
      </HStack>
      <HStack spacing="2">
        <Tooltip
          isDisabled={pendingTransactions.length === 0}
          label={
            <Box maxWidth="240px">
              The total number of transactions pending across all listings on
              this collection, including ones not shown in the activity feed
              below.
              <Table variant="unstyled" size="xs" fontSize="xs" mt="2">
                <Tbody>
                  <Tr>
                    <Td p="2px">Transactions:</Td>
                    <Td p="2px" fontWeight="bold" textAlign="right">
                      {pendingTransactions.length}
                    </Td>
                  </Tr>
                  <Tr>
                    <Td p="2px">Unique Buyers:</Td>
                    <Td p="2px" fontWeight="bold" textAlign="right">
                      {_.uniqBy(pendingTransactions, 'tokenId').length}
                    </Td>
                  </Tr>
                  <Tr>
                    <Td p="2px">Unique Assets:</Td>
                    <Td p="2px" fontWeight="bold" textAlign="right">
                      {_.uniqBy(pendingTransactions, 'fromAddress').length}
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
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
            pointerEvents={pendingTransactions.length === 0 ? 'none' : 'auto'}
            bg={useColorModeValue('gray.200', 'whiteAlpha.100')}
            px="3"
            py="2"
            borderRadius="md"
            opacity={pendingTransactions.length ? 1 : 0}
            transition="opacity 250ms ease"
            spacing="2"
            mr="3"
          >
            <Spinner width="10px" height="10px" thickness="1px" ml="1" />
            <Text fontSize="sm">
              {pendingTransactions.length} total pending{' '}
            </Text>
          </HStack>
        </Tooltip>
        <VStack
          spacing="0"
          alignItems="flex-end"
          justifyContent="center"
          minWidth="60px"
        >
          <Text fontWeight="semibold" fontSize="sm" m="0">
            Floor
          </Text>
          <Flex alignItems="center">
            <Flex width="100%" alignItems="center">
              {floor !== undefined ? (
                <>
                  {floor?.currency === 'ETH' ? <EthereumIcon /> : null}
                  <Tooltip
                    label={
                      <Box>
                        <Text m="0">
                          Floor updated{' '}
                          {floorTooltipOpen ? (
                            <TimeAgo date={floorLoadedAt} live={false} />
                          ) : null}
                        </Text>
                        <Text opacity="0.75" mt="1" mb="0" fontSize="xs">
                          Click to force update
                        </Text>
                      </Box>
                    }
                    size="md"
                    hasArrow
                    bg="gray.700"
                    placement="top"
                    color="white"
                    onOpen={() => setFloorTooltipOpen(true)}
                    onClose={() => setFloorTooltipOpen(false)}
                    px="3"
                    py="2"
                  >
                    <Text
                      fontWeight="500"
                      verticalAlign="middle"
                      cursor="pointer"
                      onClick={forceReloadFloor}
                    >
                      {floor === null
                        ? 'Unavailable'
                        : `${floor.price} ${
                            floor.currency !== 'ETH' ? ` ${floor.currency}` : ''
                          }`}
                    </Text>
                  </Tooltip>
                </>
              ) : null}
              {floorLoading ? (
                <Spinner ml={1} width={3} height={3} opacity={0.75} />
              ) : null}
            </Flex>
          </Flex>
        </VStack>
        <IconButton
          opacity="0.75"
          icon={<SmallCloseIcon />}
          bg="transparent"
          aria-label="delete"
          onClick={onRemove}
        />
      </HStack>
    </HStack>
  )
}

export default WatchedCollection
