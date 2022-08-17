import {
  HStack,
  Box,
  Flex,
  Text,
  Image,
  Circle,
  useColorModeValue,
} from '@chakra-ui/react'
import { memo, useState } from 'react'
import { readableEthValue } from '../../utils/ethereum'
import AssetInfo, { LIST_HEIGHT, LIST_WIDTH } from '../AssetInfo/AssetInfo'
import TimeAgo from 'react-timeago'
import EthereumIcon from '../EthereumIcon'
import { Chain } from '../../utils/api'
import { Notifier } from './ListingNotifierForm'
import InternalLink from '../InternalLink'
import ImageZoom from '../ImageZoom'
import { PendingTransaction as PendingTransactionType } from '../../hooks/usePendingTransactions'
import PendingTransactions from './PendingTransactions'
import { Sale } from '../../hooks/useActivity'
import Sold from './Sold'

export type MatchedAsset = {
  listingId: string
  tokenId: string
  contractAddress: string
  sellerAddress: string
  chain: Chain
  name: string
  image: string
  price: string
  currency: string
  timestamp: string
  notifier: Pick<Notifier, 'id' | 'gasOverride'>
}

const MatchedAssetListing = memo(
  ({
    asset,
    pendingTransactions,
    sale,
  }: {
    asset: MatchedAsset
    pendingTransactions?: PendingTransactionType[]
    sale?: Sale
  }) => {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    const idCircleBackground = useColorModeValue(
      'blackAlpha.100',
      'blackAlpha.300',
    )

    return (
      <HStack
        spacing="2"
        ref={(refContainer) => {
          if (!container && refContainer) {
            setContainer(refContainer)
          }
        }}
        width="100%"
      >
        {container ? (
          <AssetInfo
            displayedPrice={asset.price}
            address={asset.contractAddress!}
            tokenId={asset.tokenId}
            type="list"
            chain={asset.chain}
            container={container}
            quickBuyGasOverride={asset.notifier.gasOverride}
            isActivityEvent
          />
        ) : (
          <Box height={LIST_HEIGHT} width={LIST_WIDTH} />
        )}
        <HStack flex="1 1 auto" spacing="3" position="relative">
          <Box flex="0 0 48px" width="48px" height="48px">
            <ImageZoom>
              <Image
                src={asset.image}
                width="48px"
                height="48px"
                borderRadius="md"
                className="SuperSea__Image"
              />
            </ImageZoom>
          </Box>
          <Box>
            <InternalLink
              route="asset"
              params={{
                address: asset.contractAddress,
                chainId: asset.chain,
                chainPath: asset.chain === 'polygon' ? 'matic/' : 'ethereum/',
                tokenId: asset.tokenId,
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
                {asset.name}
              </Text>
            </InternalLink>
            <Box fontSize="sm" opacity="0.5">
              <TimeAgo date={new Date(`${asset.timestamp}Z`)} minPeriod={5} />
            </Box>
          </Box>
        </HStack>
        <HStack spacing="4">
          {sale ? (
            <Sold sale={sale} />
          ) : (
            <PendingTransactions
              pendingTransactions={pendingTransactions?.filter(
                ({ addedAt }) => {
                  return addedAt >= +new Date(asset.timestamp + 'Z') - 5000
                },
              )}
            />
          )}
          <Flex
            alignItems="center"
            opacity={sale ? 0.5 : 1}
            minWidth="60px"
            justifyContent="flex-end"
          >
            <EthereumIcon mx="0.5em" wrapped={asset.currency === 'WETH'} />
            <Text
              fontWeight="600"
              textDecoration={sale ? 'line-through' : 'none'}
            >
              {readableEthValue(+asset.price)}
            </Text>
          </Flex>
        </HStack>
        <Box pl="4">
          <Circle
            p="2"
            width="28px"
            height="28px"
            fontWeight="bold"
            bg={idCircleBackground}
          >
            {asset.notifier.id}
          </Circle>
        </Box>
      </HStack>
    )
  },
  (prev, next) =>
    prev.asset.listingId === next.asset.listingId &&
    Boolean(prev.sale) === Boolean(next.sale) &&
    prev.pendingTransactions?.length === next.pendingTransactions?.length,
)

export default MatchedAssetListing
