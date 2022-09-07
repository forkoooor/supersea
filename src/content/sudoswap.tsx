import _ from 'lodash'
import AssetInfo from '../components/AssetInfo/AssetInfo'
import SudonautRoyalties from '../components/SudonautRoyalties'
import { RemoteConfigs } from '../hooks/useRemoteConfig'
import { fetchRemoteConfig } from '../utils/api'
import { getExtensionConfig } from '../utils/extensionConfig'
import { getLangAgnosticPath } from '../utils/route'
import { injectElement, selectElement } from '../utils/selector'
import {
  addGlobalStyle,
  injectReact,
  NODE_PROCESSED_DATA_KEY,
  setupAssetInfoRenderer,
} from './shared'

const injectAssetInfo = async () => {
  const config = await fetchRemoteConfig('sudoswap')
  const { injectionSelectors: selectors } = config

  const gridContainers = Array.from(
    document.querySelectorAll(selectors.assetInfo.grid.node.selector),
  )

  const itemContainers = Array.from(
    document.querySelectorAll(selectors.assetInfo.item.node.selector),
  )

  const nodes = [
    ...gridContainers.map((node) => ({
      node,
      type: 'grid',
      selectorConfig: selectors.assetInfo.grid,
    })),
    ...itemContainers.map((node) => ({
      node,
      type: 'item',
      selectorConfig: selectors.assetInfo.item,
    })),
  ] as {
    node: HTMLElement
    type: React.ComponentProps<typeof AssetInfo>['type']
    selectorConfig: RemoteConfigs['sudoswap']['injectionSelectors']['assetInfo'][
      | 'grid'
      | 'item']
  }[]

  nodes.forEach(({ node, type, selectorConfig }) => {
    if (node.dataset[NODE_PROCESSED_DATA_KEY]) return
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'

    const { address, tokenId, linkType } = (() => {
      if (type === 'grid') {
        const config = selectorConfig as RemoteConfigs['sudoswap']['injectionSelectors']['assetInfo']['grid']
        const collectionLink = selectElement(node, config.collectionLink)
        const poolLink = selectElement(node, config.poolLink)
        const link = collectionLink || poolLink
        const linkType = collectionLink ? 'collection' : 'pool'
        if (!link) return {}
        const href = link.getAttribute('href')
        if (!href) return {}

        let [address] = href.split('/').slice(-1)
        const id = selectElement(node, config.id)
        if (id && address) {
          const match = id.textContent?.match(/\d+/)
          return {
            address,
            tokenId: match ? match[0] : '',
            linkType,
          }
        }
      }
      if (type === 'item') {
        const [page, address, tokenId] = window.location.hash
          .split('/')
          .slice(-3)
        if (page === 'item' && address && tokenId) {
          return {
            address,
            tokenId,
          }
        }
      }
      return {}
    })()
    if (!(address && tokenId)) return

    const injectionContainer = document.createElement('div')
    injectionContainer.classList.add('SuperSea__AssetInfo')
    injectionContainer.classList.add(`SuperSea__AssetInfo--${type}`)
    injectionContainer.classList.add('SuperSea__AssetInfo--Unrendered')
    injectElement(node, injectionContainer, selectorConfig.node.injectionMethod)
    injectionContainer.dataset['address'] = linkType === 'pool' ? '' : address
    injectionContainer.dataset['sudoswapPoolAddress'] =
      linkType === 'pool' ? address : ''
    injectionContainer.dataset['tokenId'] = tokenId
    injectionContainer.dataset['marketplace'] = 'sudoswap'
    injectionContainer.dataset['chain'] = 'ethereum'
    injectionContainer.dataset['type'] = type
  })
}

const throttledInjectAssetInfo = _.throttle(injectAssetInfo, 250)

const injectSudonautRoyalties = async () => {
  const config = await fetchRemoteConfig('sudoswap')
  const { injectionSelectors: selectors } = config

  const itemNodes = Array.from(
    document.querySelectorAll(selectors.sudonautRoyalties.item.node.selector),
  )
  const listNodes = Array.from(
    document.querySelectorAll(selectors.sudonautRoyalties.list.node.selector),
  )

  const nodes = [
    ...itemNodes.map((node) => ({
      node,
      type: 'item',
      selectorConfig: selectors.sudonautRoyalties.item,
    })),
    ...listNodes.map((node) => ({
      node,
      type: 'list',
      selectorConfig: selectors.sudonautRoyalties.list,
    })),
  ] as {
    node: HTMLElement
    type: React.ComponentProps<typeof SudonautRoyalties>['type']
    selectorConfig: RemoteConfigs['sudoswap']['injectionSelectors']['sudonautRoyalties'][
      | 'item'
      | 'list']
  }[]

  nodes.forEach(({ node, type, selectorConfig }) => {
    if (node.dataset[NODE_PROCESSED_DATA_KEY]) return
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'

    const { address } = (() => {
      if (type === 'item') {
        const [page, address] = window.location.hash.split('/').slice(-2)
        if (page === 'manage' && address) {
          return {
            address,
          }
        }
      }
      if (type === 'list') {
        const [page, address] =
          node.getAttribute('href')?.split('/').slice(-2) || []
        if (page === 'manage' && address) {
          return {
            address,
          }
        }
      }
      return {}
    })()
    if (!address) return

    const container = document.createElement('div')
    container.classList.add('SuperSea__SudonautRoyalties')
    injectElement(node, container, selectorConfig.node.injectionMethod)
    injectReact(
      <SudonautRoyalties poolAddress={address} type={type} />,
      container,
    )
  })
}

const throtledInjectSudonautRoyalties = _.throttle(injectSudonautRoyalties, 250)

const setupInjections = () => {
  injectAssetInfo()
  injectSudonautRoyalties()

  const observer = new MutationObserver(() => {
    throttledInjectAssetInfo()
    throtledInjectSudonautRoyalties()
  })

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  })
}

const initialize = async () => {
  const config = await getExtensionConfig()
  if (config.enabled.sudoswap) {
    document.body.dataset['superseaPath'] = getLangAgnosticPath()

    addGlobalStyle('sudoswap')
    setupInjections()
    setupAssetInfoRenderer()
  }
}

initialize()
