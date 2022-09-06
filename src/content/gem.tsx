import _ from 'lodash'
import AssetInfo from '../components/AssetInfo/AssetInfo'
import { RemoteConfigs } from '../hooks/useRemoteConfig'
import { fetchRemoteConfig } from '../utils/api'
import { getExtensionConfig } from '../utils/extensionConfig'
import { getLangAgnosticPath } from '../utils/route'
import { injectElement, selectElement } from '../utils/selector'
import {
  addGlobalStyle,
  NODE_PROCESSED_DATA_KEY,
  setupAssetInfoRenderer,
} from './shared'

const injectAssetInfo = async () => {
  const config = await fetchRemoteConfig('gem')
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
    selectorConfig: RemoteConfigs['gem']['injectionSelectors']['assetInfo'][
      | 'grid'
      | 'item']
  }[]

  nodes.forEach(({ node, type, selectorConfig }) => {
    if (node.dataset[NODE_PROCESSED_DATA_KEY]) return
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'

    const { address, tokenId } = (() => {
      if (type === 'grid') {
        const config = selectorConfig as RemoteConfigs['gem']['injectionSelectors']['assetInfo']['grid']
        const link = selectElement(node, config.link)
        if (!link) return {}
        const href = link.getAttribute('href')
        if (!href) return {}

        let [address, tokenId] = href.split('/').slice(-2)
        if (tokenId && address) {
          return {
            address,
            tokenId,
          }
        }
      }
      if (type === 'item') {
        const [page, address, tokenId] = window.location.pathname
          .split('/')
          .slice(-3)
        if (page === 'asset' && address && tokenId) {
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
    injectionContainer.dataset['address'] = address
    injectionContainer.dataset['tokenId'] = tokenId
    injectionContainer.dataset['marketplace'] = 'gem'
    injectionContainer.dataset['chain'] = 'ethereum'
    injectionContainer.dataset['type'] = type
  })
}

const throttledInjectAssetInfo = _.throttle(injectAssetInfo, 250)

const setupInjections = () => {
  injectAssetInfo()

  const observer = new MutationObserver(() => {
    throttledInjectAssetInfo()
  })

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  })
}

const initialize = async () => {
  const config = await getExtensionConfig()
  if (config.enabled.gem) {
    document.body.dataset['superseaPath'] = getLangAgnosticPath()

    addGlobalStyle('gem')
    setupInjections()
    setupAssetInfoRenderer()
  }
}

initialize()
