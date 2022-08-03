import { useEffect, useState, useContext, useCallback } from 'react'

import {
  Box,
  Flex,
  Text,
  VStack,
  Spinner,
  useToast,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react'
import TimeAgo from 'react-timeago'
import {
  Chain,
  fetchCollectionSlug,
  fetchIsRanked,
  fetchMetadata,
  fetchRarities,
  fetchRemoteConfig,
  triggerOpenSeaMetadataRefresh,
} from '../../utils/api'
import Toast from '../Toast'
import EthereumIcon from '../EthereumIcon'
import Logo from '../Logo'
import RefreshIndicator, { RefreshState } from './RefreshIndicator'
import { EventEmitterContext, GlobalConfigContext } from '../AppProvider'
import { RateLimit } from 'async-sema'
import BuyNowButton from './BuyNowButton'

import { selectElement } from '../../utils/selector'
import {
  determineRarityType,
  RARITY_TYPES,
  useTraitCountExcluded,
} from '../../utils/rarity'
import useFloor from '../../hooks/useFloor'
import PropertiesModal from './PropertiesModal'
import { useUser } from '../../utils/user'
import AssetInfoMenu from './AssetInfoMenu'
import RarityBadge, { Rarity } from './RarityBadge'

export const HEIGHT = 85
export const LIST_HEIGHT = 62
export const LIST_WIDTH = 140
const MEMBERSHIP_ADDRESS = '0x24e047001f0ac15f72689d3f5cd0b0f52b1abdf9'

const replaceImageRateLimit = RateLimit(3)

const AssetInfo = ({
  address,
  tokenId,
  type,
  container,
  collectionSlug: inputCollectionSlug,
  chain,
  displayedPrice,
  quickBuyGasOverride,
  isActivityEvent = false,
}: {
  address: string
  tokenId: string
  collectionSlug?: string
  type: 'grid' | 'list' | 'item' | 'sell'
  chain: Chain
  container: HTMLElement
  displayedPrice?: string
  quickBuyGasOverride?: null | { fee: number; priorityFee: number }
  isActivityEvent?: boolean
}) => {
  const events = useContext(EventEmitterContext)
  const globalConfig = useContext(GlobalConfigContext)

  const { isSubscriber } = useUser() || { isSubscriber: false }

  const [rarity, setRarity] = useState<Rarity | null | undefined>(undefined)
  const [refreshState, setRefreshState] = useState<RefreshState>('IDLE')
  const [isAutoQueued, setIsAutoQueued] = useState(false)
  const [isAutoImageReplaced, setIsAutoImageReplaced] = useState(false)
  const [floorTooltipOpen, setFloorTooltipOpen] = useState(false)
  const [collectionSlug, setCollectionSlug] = useState(inputCollectionSlug)
  const [propertiesModalOpen, setPropertiesModalOpen] = useState(false)
  const [traitCountExcluded] = useTraitCountExcluded(address)

  const toast = useToast()
  const isMembershipNFT = MEMBERSHIP_ADDRESS === address
  const isAccountPage = window.location.pathname.split('/')[1] === 'account'

  const quickBuyAvailable = (() => {
    if (isAccountPage && !isActivityEvent) return false
    if (type === 'sell') return false
    return true
  })()

  const activeRarity = rarity && {
    isRanked: rarity.isRanked,
    tokenCount: rarity.tokenCount,
    rank: traitCountExcluded ? rarity.noTraitCountRank : rarity.rank,
    type: traitCountExcluded ? rarity.noTraitCountType : rarity.type,
  }

  const {
    floor,
    loading: floorLoading,
    loadedAt: floorLoadedAt,
    forceReload: forceReloadFloor,
  } = useFloor(collectionSlug, chain)

  const replaceImage = useCallback(async () => {
    await replaceImageRateLimit()
    const { injectionSelectors: selectors } = await fetchRemoteConfig()
    try {
      const metadata = await fetchMetadata(address, +tokenId)

      if (!(metadata?.image || metadata?.image_url)) {
        throw new Error('Unable to load metadata')
      }

      const imgElement = selectElement(
        container,
        selectors.assetInfo[type].image,
      ) as HTMLElement
      if (imgElement) {
        imgElement.style.opacity = '0'
        setTimeout(() => {
          imgElement.setAttribute('src', '')
        }, 0)
        setTimeout(() => {
          imgElement.style.opacity = '1'
          imgElement.setAttribute(
            'src',
            (metadata.image || metadata.image_url).replace(
              /^ipfs:\/\//,
              'https://ipfs.io/ipfs/',
            ),
          )
        }, 100)
      }
    } catch (err) {
      console.error(err)
      toast({
        duration: 3000,
        position: 'bottom-right',
        render: () => (
          <Toast text="Unable to load source image." type="error" />
        ),
      })
    }
  }, [address, container, toast, tokenId, type])

  const autoReplaceImage = useCallback(() => {
    if (globalConfig.autoImageReplaceAddresses[address]) {
      setIsAutoImageReplaced(true)
      if (!globalConfig.imageReplaced[`${address}/${tokenId}`]) {
        globalConfig.imageReplaced[`${address}/${tokenId}`] = true
        replaceImage()
      }
    } else if (isAutoImageReplaced) {
      setIsAutoImageReplaced(false)
    }
  }, [address, globalConfig, replaceImage, isAutoImageReplaced, tokenId])

  useEffect(() => {
    events.addListener('toggleAutoReplaceImage', autoReplaceImage)
    return () => {
      events.removeListener('toggleAutoReplaceImage', autoReplaceImage)
    }
  }, [autoReplaceImage, events])

  useEffect(() => {
    autoReplaceImage()
  }, [autoReplaceImage])

  const queueRefresh = useCallback(async () => {
    if (refreshState === 'QUEUING') return
    setRefreshState('QUEUING')
    try {
      await triggerOpenSeaMetadataRefresh(address, tokenId)
      setRefreshState('QUEUED')
    } catch (err) {
      setRefreshState('FAILED')
    }
  }, [address, refreshState, tokenId])

  const autoQueueRefresh = useCallback(() => {
    if (globalConfig.autoQueueAddresses[address]) {
      setIsAutoQueued(true)
      if (!globalConfig.refreshQueued[`${address}/${tokenId}`]) {
        globalConfig.refreshQueued[`${address}/${tokenId}`] = true
        queueRefresh()
      }
    } else if (isAutoQueued) {
      setIsAutoQueued(false)
    }
  }, [address, globalConfig, isAutoQueued, queueRefresh, tokenId])

  useEffect(() => {
    events.addListener('toggleAutoQueue', autoQueueRefresh)
    return () => {
      events.removeListener('toggleAutoQueue', autoQueueRefresh)
    }
  }, [autoQueueRefresh, events])

  useEffect(() => {
    autoQueueRefresh()
  }, [autoQueueRefresh])

  useEffect(() => {
    if (collectionSlug) return
    if (!address || !tokenId) return
    if (chain === 'polygon') return
    ;(async () => {
      const slug = await fetchCollectionSlug(address, tokenId)
      setCollectionSlug(slug)
    })()
  }, [address, tokenId, collectionSlug, chain])

  useEffect(() => {
    if (!(address && tokenId)) return
    ;(async () => {
      if (chain === 'polygon') {
        setRarity(null)
        return
      }
      if (isSubscriber) {
        const rarities = await fetchRarities(address)
        if (rarities) {
          const { tokenCount, tokens, totalSupply, rankWarning } = rarities
          const token = tokens.find(
            ({ iteratorID }) => String(iteratorID) === tokenId,
          )
          if (token) {
            const { rank, noTraitCountRank } = token
            if (rank !== null) {
              setRarity({
                isRanked: true,
                tokenCount,
                totalSupply,
                rankWarning,
                rank,
                type: determineRarityType(rank, tokenCount),
                noTraitCountRank: noTraitCountRank,
                noTraitCountType: determineRarityType(
                  noTraitCountRank,
                  tokenCount,
                ),
              })
              return
            }
          }
        }
        setRarity(null)
      } else {
        const isRanked = await fetchIsRanked(address)
        if (isMembershipNFT) {
          setRarity({
            isRanked: true,
            tokenCount: 100,
            totalSupply: null,
            rankWarning: null,
            rank: 1,
            type: RARITY_TYPES[0],
            noTraitCountRank: 1,
            noTraitCountType: RARITY_TYPES[0],
          })
        } else {
          setRarity({
            isRanked: Boolean(isRanked),
            tokenCount: 0,
            totalSupply: null,
            rankWarning: null,
            rank: 0,
            type: RARITY_TYPES[RARITY_TYPES.length - 1],
            noTraitCountRank: 0,
            noTraitCountType: RARITY_TYPES[RARITY_TYPES.length - 1],
          })
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, tokenId])

  return (
    <Box
      pr={type === 'list' ? 3 : 0}
      width={type === 'list' ? '190px' : undefined}
    >
      <Flex
        height={type === 'list' ? `${LIST_HEIGHT}px` : `${HEIGHT}px`}
        minWidth={type === 'list' ? `${LIST_WIDTH}px` : 0}
        transition="background 250ms ease"
        position={type === 'grid' ? 'absolute' : 'relative'}
        bottom={type === 'grid' ? 0 : undefined}
        width="100%"
        pt={type === 'list' ? 6 : 4}
        pb={type === 'list' ? 1 : 3}
        px="3"
        alignItems="flex-end"
        borderBottomRadius="5px"
        borderTopRadius={type === 'list' ? '5px' : 0}
        fontSize={type === 'list' ? '12px' : '14px'}
        color={useColorModeValue('gray.700', 'white')}
        border={type === 'list' ? '1px solid' : undefined}
        borderTop="1px solid"
        borderColor={useColorModeValue('gray.200', 'transparent')}
        _hover={{
          '.SuperSea__BuyNowContainer': {
            opacity: 1,
          },
        }}
        bg={useColorModeValue(
          activeRarity && (isSubscriber || isMembershipNFT)
            ? activeRarity.type.color.light
            : 'gray.50',
          activeRarity && (isSubscriber || isMembershipNFT)
            ? activeRarity.type.color.dark
            : 'gray.600',
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName !== 'A') {
            e.preventDefault()
          }
          e.stopPropagation()
        }}
      >
        <Box
          position="absolute"
          pointerEvents="none"
          width="100%"
          top="0"
          right="0"
          height="100%"
          borderBottomRightRadius="5px"
          borderTopRightRadius={type === 'list' ? '5px' : 0}
          overflow="hidden"
          zIndex={0}
        >
          <Logo
            flipped
            position="absolute"
            opacity={rarity && (isSubscriber || isMembershipNFT) ? 0.15 : 0.1}
            width={type === 'list' ? '42px' : '60px'}
            height={type === 'list' ? '42px' : '60px'}
            top="50%"
            right="6px"
            transform="translateY(-50%)"
            color={useColorModeValue('black', 'white')}
          />
          <Box position="absolute" bottom="2" right="2">
            <RefreshIndicator state={refreshState} />
          </Box>
        </Box>
        <AssetInfoMenu
          address={address}
          collectionSlug={collectionSlug}
          tokenId={tokenId}
          chain={chain}
          isAccountPage={isAccountPage}
          isAutoImageReplaced={isAutoImageReplaced}
          isAutoQueued={isAutoQueued}
          replaceImage={replaceImage}
          queueRefresh={queueRefresh}
        />
        <VStack
          spacing={type === 'list' ? 0 : 1}
          alignItems="flex-start"
          width="100%"
          zIndex={0}
        >
          <Flex width="100%" alignItems="center">
            <Text opacity={0.7} mr="0.5em">
              Rank:
            </Text>
            {rarity !== undefined ? (
              <RarityBadge
                type={type}
                isSubscriber={isSubscriber}
                rarity={rarity}
                traitCountExcluded={Boolean(traitCountExcluded)}
                isMembershipNFT={isMembershipNFT}
                onOpenProperties={() => setPropertiesModalOpen(true)}
              />
            ) : (
              <Spinner ml={1} width={3} height={3} opacity={0.75} />
            )}
          </Flex>
          <Flex width="100%" alignItems="center">
            <Text opacity={0.7} mr="0.5em">
              Floor:{' '}
            </Text>
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
                  <Text cursor="pointer" onClick={forceReloadFloor}>
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
        </VStack>
        <Box
          position="absolute"
          pointerEvents="none"
          width="100%"
          top="0"
          right="0"
          height="100%"
          overflow="hidden"
          zIndex={0}
        >
          <Box position="absolute" bottom="2" right="2">
            <RefreshIndicator state={refreshState} />
          </Box>
        </Box>
        {quickBuyAvailable && (
          <Box
            position="absolute"
            top="0"
            right="0"
            m="1"
            className="SuperSea__BuyNowContainer"
            opacity="0"
            transition="opacity 115ms ease"
          >
            <BuyNowButton
              address={address}
              tokenId={tokenId}
              displayedPrice={displayedPrice}
              gasOverride={quickBuyGasOverride}
            />
          </Box>
        )}
      </Flex>
      {propertiesModalOpen && (
        <PropertiesModal
          collectionSlug={collectionSlug}
          address={address}
          tokenId={tokenId}
          onClose={() => setPropertiesModalOpen(false)}
        />
      )}
    </Box>
  )
}

export default AssetInfo
