import { CheckIcon } from '@chakra-ui/icons'
import {
  Menu,
  MenuButton,
  IconButton,
  Icon,
  Text,
  MenuList,
  MenuGroup,
  Tag,
  MenuItem,
  MenuDivider,
  useToast,
  Spinner,
  HStack,
  useColorModeValue,
  useToken,
} from '@chakra-ui/react'
import _ from 'lodash'
import { useContext, useState } from 'react'
import { CgNotes } from 'react-icons/cg'
import queryString from 'query-string'
import LooksRareSvg from '../../assets/looksrare.svg'
import X2Y2Svg from '../../assets/x2y2.svg'
import SnipedSvg from '../../assets/sniped.svg'
import SudoSwapSvg from '../../assets/sudoswap.svg'
import BlurSvg from '../../assets/blur.svg'
import GemSvg from '../../assets/gemxyz.svg'
import EtherScanSvg from '../../assets/etherscan.svg'
import PolygonScanSvg from '../../assets/polygonscan.svg'
import OpenseaSvg from '../../assets/opensea.svg'
import { FiMoreHorizontal } from 'react-icons/fi'
import {
  fetchCollectionAssetsForUser,
  fetchOpenSeaGraphQL,
  fetchRemoteConfig,
  fetchMetadataUriWithOpenSeaFallback,
  Chain,
  Marketplace,
} from '../../utils/api'
import { isSubscriber } from '../../utils/user'
import LockedFeature from '../LockedFeature'
import ScopedCSSPortal from '../ScopedCSSPortal'
import Toast from '../Toast'
import TooltipIconButton from '../TooltipIconButton'
import { EventEmitterContext, GlobalConfigContext } from '../AppProvider'

const AssetInfoMenu = ({
  address,
  tokenId,
  collectionSlug,
  chain,
  marketplace,
  queueRefresh,
  replaceImage,
  isAccountPage,
  isAutoQueued,
  isAutoImageReplaced,
}: {
  address: string
  tokenId: string
  collectionSlug?: string
  chain: string
  marketplace: Marketplace
  queueRefresh: () => void
  replaceImage: () => void
  isAccountPage: boolean
  isAutoQueued: boolean
  isAutoImageReplaced: boolean
}) => {
  const [hidingItems, setHidingItems] = useState(false)
  const events = useContext(EventEmitterContext)
  const globalConfig = useContext(GlobalConfigContext)

  const toast = useToast()
  const menuBorder = useColorModeValue('gray.200', 'gray.800')
  const menuBorderResolved = useToken('colors', menuBorder)
  const menuColor = useColorModeValue('black', 'white')
  const isHiddenTab =
    queryString.parse(window.location.search).tab === 'private'

  return (
    <Menu autoSelect={false}>
      {({ onClose }) => (
        <>
          <MenuButton
            as={IconButton}
            icon={<Icon as={FiMoreHorizontal} />}
            size="md"
            position="absolute"
            zIndex="10"
            top="0"
            bg="transparent"
            height="20px"
            mt="1"
            minWidth="24px"
            ml="5px"
            left="0"
          >
            More Options
          </MenuButton>
          <ScopedCSSPortal>
            <MenuList
              borderColor={menuBorder}
              zIndex="popover"
              color={menuColor}
              css={{
                hr: {
                  border: '0 !important',
                  height: '1px',
                  backgroundColor: menuBorderResolved,
                },
              }}
              fontSize="sm"
            >
              <MenuGroup
                // @ts-ignore
                title={
                  <Text>
                    Metadata{' '}
                    {chain === 'polygon' ? (
                      <Tag fontSize="xs" mt="-1px" ml="0.35em">
                        Unavailable
                      </Tag>
                    ) : null}
                  </Text>
                }
                mr="0"
              >
                {marketplace === 'opensea' && (
                  <MenuItem
                    isDisabled={chain === 'polygon'}
                    onClick={queueRefresh}
                  >
                    Queue OpenSea refresh
                  </MenuItem>
                )}
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={replaceImage}
                >
                  Replace image from source
                </MenuItem>
                {marketplace === 'opensea' && (
                  <MenuItem
                    isDisabled={chain === 'polygon'}
                    onClick={async () => {
                      globalConfig.autoQueueAddresses[address] = !globalConfig
                        .autoQueueAddresses[address]

                      if (!globalConfig.autoQueueAddresses[address]) {
                        Object.keys(globalConfig.refreshQueued).forEach(
                          (key) => {
                            const [_address] = key.split('/')
                            if (address === _address) {
                              globalConfig.refreshQueued[key] = false
                            }
                          },
                        )
                      }

                      events.emit('toggleAutoQueue', {
                        value: globalConfig.autoQueueAddresses[address],
                        address,
                      })
                    }}
                  >
                    <Text maxWidth="210px">
                      Mass-queue OpenSea refresh for collection
                      {isAutoQueued && (
                        <CheckIcon
                          width="12px"
                          height="auto"
                          display="inline-block"
                          marginLeft="3px"
                        />
                      )}
                    </Text>
                  </MenuItem>
                )}
                <MenuItem
                  isDisabled={chain === 'polygon'}
                  onClick={async () => {
                    globalConfig.autoImageReplaceAddresses[
                      address
                    ] = !globalConfig.autoImageReplaceAddresses[address]

                    if (!globalConfig.autoImageReplaceAddresses[address]) {
                      Object.keys(globalConfig.imageReplaced).forEach((key) => {
                        const [_address] = key.split('/')
                        if (address === _address) {
                          globalConfig.imageReplaced[key] = false
                        }
                      })
                    }

                    events.emit('toggleAutoReplaceImage', {
                      value: globalConfig.autoImageReplaceAddresses[address],
                      address,
                    })
                  }}
                >
                  <Text maxWidth="210px">
                    Mass-replace image from source for collection
                    {isAutoImageReplaced && (
                      <CheckIcon
                        width="12px"
                        height="auto"
                        display="inline-block"
                        marginLeft="3px"
                      />
                    )}
                  </Text>
                </MenuItem>
              </MenuGroup>
              <MenuDivider />
              {isAccountPage && (
                <>
                  <MenuGroup
                    // @ts-ignore
                    title={
                      <Text>
                        Account{' '}
                        {chain !== 'ethereum' ? (
                          <Tag fontSize="xs" mt="-1px" ml="0.35em">
                            Unavailable
                          </Tag>
                        ) : null}
                      </Text>
                    }
                  >
                    <MenuItem
                      closeOnSelect={false}
                      isDisabled={!isSubscriber || chain !== 'ethereum'}
                      onClick={async () => {
                        if (hidingItems || !isSubscriber) return
                        setHidingItems(true)
                        const walletAddress: string = await new Promise(
                          (resolve) => {
                            const messageListener = (event: MessageEvent) => {
                              if (
                                event.data.method ===
                                'SuperSea__GetEthAddress__Success'
                              ) {
                                window.removeEventListener(
                                  'message',
                                  messageListener,
                                )
                                resolve(event.data.params.ethAddress)
                              }
                            }
                            window.addEventListener('message', messageListener)
                            window.postMessage({
                              method: 'SuperSea__GetEthAddress',
                            })
                          },
                        )
                        const cookies = new URLSearchParams(
                          document.cookie.replaceAll('; ', '&'),
                        )
                        const sessionKey = JSON.parse(
                          cookies.get(`session_${walletAddress}`) || 'null',
                        )
                        if (!sessionKey) {
                          setHidingItems(false)
                          onClose()
                          toast({
                            duration: 15000,
                            position: 'bottom-right',
                            render: () => (
                              <Toast
                                text="OpenSea session expired, please navigate to the profile settings page and sign the message with your wallet to re-authenticate."
                                type="error"
                              />
                            ),
                          })
                          return
                        }
                        const assets = await fetchCollectionAssetsForUser({
                          walletAddress,
                          contractAddress: address,
                        })
                        const result = await fetchOpenSeaGraphQL(
                          'AssetSelectionSetPrivacyMutation',
                          {
                            variables: {
                              assets: assets.map((asset) => {
                                return window.btoa(`AssetType:${asset.id}`)
                              }),
                              isPrivate: !isHiddenTab,
                            },
                            sessionKey,
                            cacheBust: false,
                          },
                        )
                        const remoteConfig = await fetchRemoteConfig()

                        let success = false
                        try {
                          success = _.get(
                            result,
                            remoteConfig.queries[
                              'AssetSelectionSetPrivacyMutation'
                            ].resultPaths.success,
                          )
                        } catch (e) {
                          console.error(e)
                        }
                        if (success) {
                          toast({
                            duration: 15000,
                            position: 'bottom-right',
                            render: () => (
                              <Toast
                                text={`Successfully ${
                                  isHiddenTab ? 'unhid' : 'hid'
                                } ${assets.length} item${
                                  assets.length === 1 ? '' : 's'
                                } from your profile. You may need to refresh the tab for the OpenSea UI to fully reflect the changes.`}
                                type="success"
                              />
                            ),
                          })
                          window.postMessage({
                            method: 'SuperSea__RefreshPage',
                          })
                        } else {
                          toast({
                            duration: 5000,
                            position: 'bottom-right',
                            render: () => (
                              <Toast
                                text={`Failed to ${
                                  isHiddenTab ? 'unhide' : 'hide'
                                } items, please try again.`}
                                type="error"
                              />
                            ),
                          })
                        }

                        setHidingItems(false)
                        onClose()
                      }}
                    >
                      <Text maxWidth="210px">
                        {isHiddenTab ? 'Unhide' : 'Hide'} entire collection from
                        profile {!isSubscriber && <LockedFeature ml="1" />}
                        {hidingItems ? (
                          <Spinner ml={2} width={3} height={3} opacity={0.75} />
                        ) : null}
                      </Text>
                    </MenuItem>
                  </MenuGroup>
                  <MenuDivider />
                </>
              )}
              <MenuGroup title="Links">
                <HStack spacing="0" px="1" maxWidth="248px" flexWrap="wrap">
                  {chain === 'ethereum' && marketplace !== 'opensea' && (
                    <TooltipIconButton
                      label="OpenSea"
                      icon={<Icon as={OpenseaSvg as any} />}
                      bg="transparent"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://opensea.io/assets/${chain}/${address}/${tokenId}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && (
                    <TooltipIconButton
                      label="LooksRare"
                      icon={<Icon as={LooksRareSvg as any} />}
                      bg="transparent"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://looksrare.org/collections/${address}/${tokenId}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && (
                    <TooltipIconButton
                      label="x2y2"
                      icon={<Icon as={X2Y2Svg as any} />}
                      bg="transparent"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://x2y2.io/eth/${address}/${tokenId}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && (
                    <TooltipIconButton
                      label="Blur"
                      icon={<Icon as={BlurSvg as any} />}
                      bg="transparent"
                      fontSize="18px"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://blur.io/collection/${address}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && marketplace !== 'gem' && (
                    <TooltipIconButton
                      label="Gem"
                      icon={<Icon as={GemSvg as any} />}
                      bg="transparent"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://gem.xyz/collection/${collectionSlug}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && marketplace !== 'sudoswap' && (
                    <TooltipIconButton
                      label="sudoswap"
                      icon={<Icon as={SudoSwapSvg as any} />}
                      bg="transparent"
                      fontSize="26px"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://sudoswap.xyz/#/browse/buy/${address}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  {chain === 'ethereum' && (
                    <TooltipIconButton
                      label="Sniped"
                      icon={<Icon as={SnipedSvg as any} />}
                      bg="transparent"
                      fontSize="20px"
                      onClick={async () => {
                        onClose()
                        window.open(
                          `https://sniped.lol/assets/${chain}/${address}/${tokenId}`,
                          '_blank',
                        )
                      }}
                    />
                  )}{' '}
                  <TooltipIconButton
                    label="Contract"
                    icon={
                      <Icon
                        as={
                          (chain === 'ethereum'
                            ? EtherScanSvg
                            : PolygonScanSvg) as any
                        }
                      />
                    }
                    bg="transparent"
                    onClick={async () => {
                      onClose()
                      window.open(
                        `https://${
                          chain === 'ethereum'
                            ? 'etherscan.io'
                            : 'polygonscan.com'
                        }/token/${address}`,
                        '_blank',
                      )
                    }}
                  />
                  {chain === 'ethereum' && (
                    <TooltipIconButton
                      label="Raw Metadata"
                      icon={<Icon as={CgNotes} />}
                      bg="transparent"
                      onClick={async () => {
                        onClose()
                        let metadataUri = null
                        try {
                          metadataUri = await fetchMetadataUriWithOpenSeaFallback(
                            address,
                            +tokenId,
                          )
                        } catch (err) {}
                        if (!metadataUri) {
                          toast({
                            duration: 3000,
                            position: 'bottom-right',
                            render: () => (
                              <Toast
                                text="Unable to load metadata."
                                type="error"
                              />
                            ),
                          })
                          return
                        }
                        if (/^data:/.test(metadataUri)) {
                          const blob = await fetch(metadataUri).then((res) =>
                            res.blob(),
                          )
                          window.open(URL.createObjectURL(blob), '_blank')
                        } else {
                          window.open(metadataUri, '_blank')
                        }
                      }}
                    />
                  )}{' '}
                </HStack>
              </MenuGroup>
            </MenuList>
          </ScopedCSSPortal>
        </>
      )}
    </Menu>
  )
}

export default AssetInfoMenu
