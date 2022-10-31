import {
  HStack,
  VStack,
  Box,
  Flex,
  Text,
  Image,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react'
import { FaShoppingCart, FaTag } from 'react-icons/fa'
import { useState, memo } from 'react'
import { readableEthValue } from '../../utils/ethereum'
import AssetInfo, { LIST_HEIGHT, LIST_WIDTH } from '../AssetInfo/AssetInfo'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { Chain } from '../../utils/api'
import InternalLink from '../InternalLink'
import ImageZoom from '../ImageZoom'
import { PendingTransaction as PendingTransactionType } from '../../hooks/usePendingTransactions'
import PendingTransactions from './PendingTransactions'
import { Sale } from '../../hooks/useActivity'
import Sold from './Sold'
import { SentTransaction } from '../../utils/quickBuy'

export type Event = {
  listingId: string
  tokenId: string
  contractAddress: string
  sellerAddress: string
  blockExplorerLink?: string
  chain: Chain
  name: string
  image: string
  price: string
  currency: string
  timestamp: string
  eventType: string
}

const ActivityEvent = memo(
  ({
    event,
    pendingTransactions,
    sentTransactions,
    sale,
  }: {
    event: Event
    pendingTransactions?: PendingTransactionType[]
    sentTransactions: SentTransaction[]
    sale?: Sale
  }) => {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)

    return (
      <HStack
        spacing="1"
        ref={(refContainer) => {
          if (!container && refContainer) {
            setContainer(refContainer)
          }
        }}
        width="100%"
      >
        {container ? (
          <AssetInfo
            displayedPrice={event.price}
            address={event.contractAddress!}
            tokenId={event.tokenId}
            type="list"
            assetMetadata={event}
            marketplace="opensea"
            chain={event.chain}
            container={container}
            isActivityEvent
          />
        ) : (
          <Box height={LIST_HEIGHT} width={LIST_WIDTH} />
        )}
        <HStack
          flex="1 1 auto"
          spacing="3"
          position="relative"
          height="100%"
          justifyContent="space-between"
        >
          <HStack spacing="3">
            <Box
              flex="0 0 48px"
              width="48px"
              height="48px"
              borderRadius="md"
              bg={useColorModeValue('blackAlpha.100', 'blackAlpha.200')}
            >
              {event.image ? (
                <ImageZoom>
                  <Image
                    src={event.image}
                    width="48px"
                    height="48px"
                    flex="0 0 48px"
                    borderRadius="md"
                    className="SuperSea__Image"
                  />
                </ImageZoom>
              ) : null}
            </Box>
            <Box>
              <InternalLink
                route="asset"
                params={{
                  address: event.contractAddress,
                  chainId: event.chain,
                  chainPath: event.chain === 'polygon' ? 'matic/' : 'ethereum/',
                  tokenId: event.tokenId,
                }}
              >
                <Text
                  my="0"
                  fontSize="sm"
                  fontWeight="500"
                  maxWidth="150px"
                  textAlign="left"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  css={{ direction: 'rtl' }}
                >
                  {event.name}
                </Text>
              </InternalLink>
              <Box fontSize="sm" opacity="0.5">
                <TimeAgo date={new Date(`${event.timestamp}Z`)} minPeriod={5} />
              </Box>
            </Box>
          </HStack>
          <HStack spacing="4">
            {event.eventType === 'CREATED' && !sale && (
              <PendingTransactions
                pendingTransactions={pendingTransactions?.filter(
                  ({ addedAt }) => {
                    return addedAt >= +new Date(event.timestamp + 'Z') - 5000
                  },
                )}
                sentTransactions={sentTransactions}
                assetMetadata={event}
              />
            )}
            {sale && <Sold sale={sale} />}
            <HStack
              spacing="4"
              opacity={sale && event.eventType === 'CREATED' ? 0.5 : 1}
            >
              <VStack spacing="0" alignItems="flex-end" justifyContent="center">
                <Text
                  fontWeight="semibold"
                  fontSize="sm"
                  color={
                    event.eventType === 'CREATED' ? 'green.400' : 'red.400'
                  }
                >
                  {(() => {
                    if (event.eventType === 'CREATED' && sale) {
                      return (
                        <Text as="span" textDecoration="line-through">
                          Listed
                        </Text>
                      )
                    }
                    return event.eventType === 'CREATED' ? 'Listed' : 'Sold'
                  })()}
                </Text>
                <Flex
                  alignItems="center"
                  minWidth="60px"
                  justifyContent="flex-end"
                >
                  <EthereumIcon
                    mx="0.5em"
                    wrapped={event.currency === 'WETH'}
                  />
                  <Text
                    fontWeight="600"
                    textDecoration={
                      sale && event.eventType === 'CREATED'
                        ? 'line-through'
                        : 'none'
                    }
                  >
                    {readableEthValue(+event.price)}
                  </Text>
                </Flex>
              </VStack>
              <Icon
                as={event.eventType === 'CREATED' ? FaTag : FaShoppingCart}
                color={event.eventType === 'CREATED' ? 'green.400' : 'red.400'}
              />
            </HStack>
          </HStack>
        </HStack>
      </HStack>
    )
  },
  (prev, next) => {
    return (
      prev.event.listingId === next.event.listingId &&
      Boolean(prev.sale) === Boolean(next.sale) &&
      prev.pendingTransactions?.length === next.pendingTransactions?.length
    )
  },
)

export default ActivityEvent
