import React, { useContext, useState } from 'react'
import {
  Icon,
  IconButton,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { FaShoppingCart } from 'react-icons/fa'
import { useExtensionConfig } from '../../utils/extensionConfig'
import { useUser } from '../../utils/user'
import { quickBuy } from '../../utils/quickBuy'
import { EventEmitterContext } from '../AppProvider'

export const BuyNowButtonUI = ({
  address,
  tokenId,
  active,
  displayedPrice,
  assetMetadata,
  gasOverride,
}: {
  address: string
  tokenId: string
  active: boolean
  displayedPrice?: string
  assetMetadata?: { name: string; image: string }
  gasOverride?: null | { fee: number; priorityFee: number }
}) => {
  const toast = useToast()
  const events = useContext(EventEmitterContext)
  const { isFounder } = useUser() || { isFounder: false }
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Tooltip
      label={active ? 'Quick Buy' : 'Activate Quick Buy'}
      fontSize="xs"
      hasArrow
      bg="gray.700"
      placement="top"
      color="white"
      px="2"
      py="1"
    >
      <IconButton
        icon={
          <Icon as={FaShoppingCart} color="white" width="14px" height="14px" />
        }
        width="32px"
        minWidth="auto"
        height="24px"
        borderRadius="lg"
        isLoading={isLoading}
        bg={useColorModeValue(
          active ? 'blue.500' : 'gray.500',
          active ? 'blue.400' : 'gray.500',
        )}
        _hover={{
          bg: useColorModeValue(
            active ? 'blue.400' : 'gray.400',
            active ? 'blue.300' : 'gray.400',
          ),
        }}
        _active={{
          bg: useColorModeValue(
            active ? 'blue.300' : 'gray.300',
            active ? 'blue.200' : 'gray.300',
          ),
        }}
        boxShadow={useColorModeValue(
          '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
          '0 1px 2px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.15)',
        )}
        aria-label="Buy Now"
        onClick={async () => {
          if (active) {
            setIsLoading(true)
            quickBuy({
              isFounder,
              events,
              toast,
              tokenId,
              address,
              displayedPrice,
              assetMetadata,
              gasOverride,
              onComplete: () => setIsLoading(false),
            })
          } else {
            chrome.runtime.sendMessage({
              method: 'openPopup',
              params: { action: 'activateQuickBuy' },
            })
          }
        }}
      />
    </Tooltip>
  )
}

const BuyNowButton = (
  props: Omit<React.ComponentProps<typeof BuyNowButtonUI>, 'active'> & {},
) => {
  const [config] = useExtensionConfig()
  const user = useUser()
  if (config === null || user === null || !user.isSubscriber) {
    return null
  }

  return <BuyNowButtonUI {...props} active={config.quickBuyEnabled} />
}

export default BuyNowButton
