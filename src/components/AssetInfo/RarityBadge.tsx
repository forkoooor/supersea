import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Text,
  VStack,
  HStack,
  Tag,
  useColorModeValue,
  useColorMode,
  Tooltip,
} from '@chakra-ui/react'

import { getActiveRarity, RarityTier } from '../../utils/rarity'
import LockedFeature from '../LockedFeature'
import AssetInfo from './AssetInfo'

export type Rarity = {
  isRanked: boolean
  tokenCount: number
  totalSupply: number | null
  rankWarning: string | null
  rank: number
  type: RarityTier
  noTraitCountRank: number
  noTraitCountType: RarityTier
}

const PARTIALLY_RANKED_RATIO_THRESHOLD = 0.9

const RarityBadge = ({
  type,
  rarity,
  traitCountExcluded,
  isSubscriber,
  isMembershipNFT,
  onOpenProperties,
}: {
  type: React.ComponentProps<typeof AssetInfo>['type']
  rarity: Rarity | null
  traitCountExcluded: boolean
  isSubscriber: boolean
  isMembershipNFT: boolean
  onOpenProperties: () => void
}) => {
  const rankTierDisparity = rarity
    ? Math.abs(rarity.type.tier - rarity.noTraitCountType.tier)
    : 0
  const hoverBg = useColorModeValue('blackAlpha.300', 'whiteAlpha.300')
  const { colorMode } = useColorMode()

  const tooltipColor = useColorModeValue('black', 'white')
  const tooltipBg = useColorModeValue('gray.50', 'gray.700')
  const warningTextBg = useColorModeValue('orange.200', 'orange.600')
  const warningTextColor = useColorModeValue('black', 'white')

  const ratioRanked =
    (rarity?.tokenCount || 1) / (rarity?.totalSupply || rarity?.tokenCount || 1)

  const isPartiallyRanked = ratioRanked < PARTIALLY_RANKED_RATIO_THRESHOLD

  if (isSubscriber || isMembershipNFT) {
    const tooltipLabel = (() => {
      if (isMembershipNFT) {
        return <Text my="0">You're all legendary to us &lt;3</Text>
      }
      if (rarity) {
        const withTraitCount = (
          <Box>
            <Text opacity="0.65" mt="0" mb="1">
              Rank with Trait Count Score
            </Text>{' '}
            <Text my="0" fontWeight="semibold">
              #{rarity.rank}{' '}
              <Tag bg={rarity.type.color[colorMode]} size="sm" mx="1">
                {rarity.type.name}
              </Tag>
              {rarity.type.top !== Infinity
                ? ` (top ${rarity.type.top * 100}%)`
                : ' (bottom 50%)'}
            </Text>
          </Box>
        )
        const withoutTraitCount = (
          <Box>
            <Text opacity="0.65" mt="0" mb="1">
              Rank without Trait Count Score
            </Text>{' '}
            <Text mb="2" my="0">
              #{rarity.noTraitCountRank}
              <Tag
                bg={rarity.noTraitCountType.color[colorMode]}
                size="sm"
                mx="2"
              >
                {rarity.noTraitCountType.name}
              </Tag>
              {rarity.noTraitCountType.top !== Infinity
                ? ` (top ${rarity.noTraitCountType.top * 100}%)`
                : ' (bottom 50%)'}
            </Text>
          </Box>
        )
        return (
          <Box lineHeight="1.6em">
            <VStack spacing="2" alignItems="flex-start">
              {traitCountExcluded ? withoutTraitCount : withTraitCount}
              {traitCountExcluded ? withTraitCount : withoutTraitCount}
            </VStack>
            {(() => {
              let text = ''
              if (rarity?.rankWarning) {
                text = rarity.rankWarning
              } else if (isPartiallyRanked) {
                text = `Only ${Math.floor(
                  ratioRanked * 100,
                )}% of the collection has been ranked so far, final ranks will change.`
              } else if (rankTierDisparity > 0) {
                text =
                  "There's a rarity tier difference with trait count score enabled/disabled. Click for more details."
              }
              return text ? (
                <Text
                  bg={warningTextBg}
                  color={warningTextColor}
                  fontSize="xs"
                  py="1"
                  px="2"
                  mb="0"
                  borderRadius="sm"
                >
                  {text}
                </Text>
              ) : null
            })()}
          </Box>
        )
      }

      return ''
    })()

    const activeRarity = getActiveRarity(rarity, traitCountExcluded)

    return (
      <HStack spacing="1">
        <Tooltip
          isDisabled={!(activeRarity || isMembershipNFT)}
          label={tooltipLabel}
          size="lg"
          hasArrow
          maxW="260px"
          borderRadius="md"
          placement="top"
          bg={tooltipBg}
          color={tooltipColor}
          px={3}
          py={3}
        >
          <Text
            fontWeight="500"
            cursor={activeRarity ? 'pointer' : undefined}
            onClick={activeRarity === null ? undefined : onOpenProperties}
            borderRadius="md"
            px="1"
            mx="-1"
            transition="background-color 150ms ease"
            _hover={{
              bg: activeRarity === null ? undefined : hoverBg,
            }}
          >
            {activeRarity === null ? (
              'Unranked'
            ) : (
              <Text as="span">
                {rarity?.rankWarning ||
                rankTierDisparity ||
                isPartiallyRanked ? (
                  <WarningTwoIcon
                    opacity="0.75"
                    width={type === 'list' ? '12px' : '16px'}
                    height={type === 'list' ? '12px' : '16px'}
                    position="relative"
                    mr="1"
                    top="-1px"
                  />
                ) : null}
                #{activeRarity.rank}
                <Text as="span" fontSize="xs" opacity="0.75">
                  {' '}
                  / {activeRarity.tokenCount}
                </Text>
              </Text>
            )}
          </Text>
        </Tooltip>
      </HStack>
    )
  }
  if (rarity && rarity.isRanked) {
    return <LockedFeature />
  }
  return <Text fontWeight="500">Unranked</Text>
}

export default RarityBadge
