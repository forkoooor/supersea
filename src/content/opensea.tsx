import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'
import queryString from 'query-string'

import BundleVerification from '../components/BundleVerification'
import AssetInfo from '../components/AssetInfo/AssetInfo'
import ProfileSummary from '../components/ProfileSummary'
import RarityDisclaimer from '../components/RarityDisclaimer'
import { getExtensionConfig } from '../utils/extensionConfig'
import { fetchRemoteConfig, getUser } from '../utils/api'
import { injectElement, selectElement, Selectors } from '../utils/selector'
import SearchResults from '../components/SearchResults/SearchResults'
import CollectionMenuItem from '../components/CollectionMenuItem'
import CollectionStats from '../components/CollectionStats'
import Activity from '../components/Activity/Activity'
import TransferInfo from '../components/TransferInfo'
import { isSubscriber } from '../utils/user'
import { createRouteParams, getLangAgnosticPath } from '../utils/route'
import {
  addGlobalStyle,
  destroyRemovedInjections,
  injectReact,
  NODE_PROCESSED_DATA_KEY,
  setCleanupActive,
  setupAssetInfoRenderer,
} from './shared'

const injectAssetInfo = async () => {
  const config = await fetchRemoteConfig()
  const { injectionSelectors: selectors } = config

  const gridNodes = Array.from(
    document.querySelectorAll(selectors.assetInfo.grid.node.selector),
  )
  const listNodes = Array.from(
    document.querySelectorAll(selectors.assetInfo.list.node.selector),
  )
  const itemNode = document.querySelector(
    selectors.assetInfo.item.node.selector,
  )
  const sellNode = document.querySelector(
    selectors.assetInfo.sell.node.selector,
  )

  const nodes = [
    ...gridNodes.map((node) => ({
      node,
      type: 'grid',
      selectorConfig: selectors.assetInfo.grid,
    })),
    ...listNodes.map((node) => ({
      node,
      type: 'list',
      selectorConfig: selectors.assetInfo.list,
    })),
    ...(itemNode
      ? [
          {
            node: itemNode,
            type: 'item',
            selectorConfig: selectors.assetInfo.item,
          },
        ]
      : []),
    ...(sellNode
      ? [
          {
            node: sellNode,
            type: 'sell',
            selectorConfig: selectors.assetInfo.sell,
          },
        ]
      : []),
  ] as {
    node: HTMLElement
    type: React.ComponentProps<typeof AssetInfo>['type']
    selectorConfig: Selectors['assetInfo'][keyof Selectors['assetInfo']]
  }[]

  nodes.forEach(({ node, type, selectorConfig }) => {
    if (node.dataset[NODE_PROCESSED_DATA_KEY]) return
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'

    const { address, tokenId, chain, collectionSlug } = (() => {
      let collectionSlug = (() => {
        let collectionLink = selectElement(node, selectorConfig.collectionLink)
        if (collectionLink) {
          return (
            (collectionLink
              .getAttribute('href')
              ?.split('/')
              .filter((s) => s.length)
              .slice(-1) || [])[0] || ''
          )
        }
        return ''
      })()

      if (type === 'item') {
        const path = window.location.pathname.split('/')
        const [tokenType, address, tokenId] = path.slice(-3)
        return {
          address: address.toLowerCase(),
          tokenId: tokenId,
          collectionSlug,
          chain: tokenType === 'matic' ? 'polygon' : tokenType,
        }
      }
      if (type === 'sell') {
        const path = window.location.pathname.split('/')
        const [tokenType, address, tokenId] = path.slice(-4, -1)
        return {
          address: address.toLowerCase(),
          tokenId: tokenId,
          collectionSlug,
          chain: tokenType === 'matic' ? 'polygon' : tokenType,
        }
      }

      let link = selectElement(node, selectorConfig.link)
      if (link) {
        const [tokenType, address, tokenId] =
          link
            .getAttribute('href')
            ?.split('/')
            .filter((s) => s.length)
            .slice(-3) || []

        return {
          address,
          tokenId,
          collectionSlug,
          chain: tokenType === 'matic' ? 'polygon' : tokenType,
        }
      }
      return {}
    })()
    if (!(address && tokenId && chain)) return

    const container = document.createElement('div')
    container.classList.add('SuperSea__AssetInfo')
    container.classList.add(`SuperSea__AssetInfo--${type}`)
    container.classList.add('SuperSea__AssetInfo--Unrendered')
    injectElement(node, container, selectorConfig.node.injectionMethod)
    container.dataset['address'] = address
    container.dataset['tokenId'] = tokenId
    container.dataset['collectionSlug'] = collectionSlug
    container.dataset['chain'] = chain
    container.dataset['marketplace'] = 'opensea'
    container.dataset['type'] = type
  })
}

const injectBundleVerification = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const bundleFrames = Array.from(
    document.querySelectorAll(selectors.bundleVerification.frameSelector),
  ) as HTMLElement[]

  bundleFrames.forEach((bundleFrame) => {
    if (!bundleFrame || bundleFrame.dataset[NODE_PROCESSED_DATA_KEY]) return

    bundleFrame.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const assets = Array.from(
      bundleFrame.querySelectorAll(selectors.bundleVerification.linkSelector),
    ) as HTMLAnchorElement[]
    if (assets.length) {
      const addresses = _.groupBy(
        assets,
        // @ts-ignore
        (asset) => asset.attributes.href.value.split('/')[2],
      )
      const numAddresses = Object.keys(addresses).length

      const header = bundleFrame.querySelector(
        selectors.bundleVerification.headerSelector,
      )
      if (header) {
        const container = document.createElement('div')
        container.classList.add('SuperSea__BundleVerification')
        header.parentNode?.insertBefore(container, header.nextSibling)
        injectReact(
          <BundleVerification numAddresses={numAddresses} />,
          container,
        )
      }
    }
  })
}

const injectProfileSummary = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const node = document.querySelector(
    selectors.profileSummary.node.selector,
  ) as HTMLElement
  if (!node || node.dataset[NODE_PROCESSED_DATA_KEY]) return
  node.dataset[NODE_PROCESSED_DATA_KEY] = '1'
  const container = document.createElement('div')
  container.classList.add('SuperSea__ProfileSummary')

  injectElement(node, container, selectors.profileSummary.node.injectionMethod)
  injectReact(<ProfileSummary />, container)
}

const throttledInjectProfileSummary = _.throttle(injectProfileSummary, 250)
const throttledInjectAssetInfo = _.throttle(injectAssetInfo, 250)
const throttledInjectBundleVerification = _.throttle(
  injectBundleVerification,
  250,
)
const throttledDestroyRemovedInjections = _.throttle(
  destroyRemovedInjections,
  1000,
)

const injectInPageContextScript = (onComplete?: () => void) => {
  const s = document.createElement('script')
  s.src = chrome.runtime.getURL('static/js/pageContextInject.js')
  document.head.appendChild(s)
  s.onload = function () {
    s.remove()
    onComplete && onComplete()
  }
}

let previouslyRenderedSearchResults: {
  container: HTMLElement | null
  collectionSlug: string | null
  scrollY: number
} = {
  container: null,
  collectionSlug: null,
  scrollY: 0,
}

const injectSearchResults = async () => {
  const path = getLangAgnosticPath()
  const collectionSlug = path.split('/').filter(Boolean)[1]

  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const container = document.querySelector(
    selectors.searchResults.containerSelector,
  )!.parentElement as HTMLElement | null
  if (container) {
    const collectionMenu = document.querySelector(
      selectors.searchResults.menuSelector,
    ) as HTMLElement | null
    if (collectionMenu) {
      collectionMenu.classList.add('SuperSea--tabActive')
    }

    let reactContainer: null | HTMLElement = null
    if (previouslyRenderedSearchResults.collectionSlug === collectionSlug) {
      reactContainer = previouslyRenderedSearchResults.container!
    } else {
      reactContainer = document.createElement('div')
      previouslyRenderedSearchResults = {
        container: reactContainer,
        collectionSlug,
        scrollY: 0,
      }
      reactContainer.classList.add('SuperSea__SearchResults')
      injectReact(
        <SearchResults collectionSlug={collectionSlug!} />,
        reactContainer,
        { autoDestroy: false },
      )
    }

    container.replaceWith(reactContainer)
    window.scrollTo({ top: previouslyRenderedSearchResults.scrollY })
    setCleanupActive(false)

    const messageListener = (event: MessageEvent) => {
      if (event.data.method === 'SuperSea__Next__routeChangeStart') {
        previouslyRenderedSearchResults.scrollY = event.data.params.scrollY
      } else if (event.data.method === 'SuperSea__Next__routeChangeComplete') {
        reactContainer!.replaceWith(container)
        if (collectionMenu) {
          collectionMenu.classList.remove('SuperSea--tabActive')
        }
        window.removeEventListener('message', messageListener)
        setCleanupActive(true)
      }
    }

    window.addEventListener('message', messageListener)
  }
}

const injectCollectionMenu = async () => {
  const { injectionSelectors: selectors, routes } = await fetchRemoteConfig()
  const collectionMenu = document.querySelector(
    selectors.searchResults.menuSelector,
  ) as HTMLElement | null
  if (collectionMenu && !collectionMenu.dataset[NODE_PROCESSED_DATA_KEY]) {
    collectionMenu.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const container = document.createElement('li')
    container.classList.add('SuperSea__CollectionMenuItem')
    container.classList.add('SuperSea__CollectionMenuItem--items')
    collectionMenu.append(container)
    injectReact(
      <CollectionMenuItem
        type="items"
        onClick={() => {
          const path = getLangAgnosticPath()
          const collectionSlug = path.split('/').filter(Boolean)[1]

          window.postMessage({
            method: 'SuperSea__Navigate',
            params: {
              ...createRouteParams(routes.searchResults, {
                collectionSlug: collectionSlug!,
              }),
              options: {
                scroll: false,
              },
            },
          })
        }}
      />,
      container,
    )
  }
}
const throttledInjectCollectionMenu = _.throttle(injectCollectionMenu, 250)

const injectRarityDisclaimer = async () => {
  const user = await getUser()
  if (user && isSubscriber(user.role)) {
    chrome.storage.local.get(
      ['rarityDisclaimerSeenAt'],
      ({ rarityDisclaimerSeenAt }) => {
        if (rarityDisclaimerSeenAt) return
        const container = document.createElement('div')
        document.body.appendChild(container)
        injectReact(
          <RarityDisclaimer
            onClose={() => {
              chrome.storage.local.set({ rarityDisclaimerSeenAt: Date.now() })
              ReactDOM.unmountComponentAtNode(container as Element)
            }}
          />,
          container,
        )
      },
    )
  }
}

const injectActivity = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()
  const node = document.querySelector(
    selectors.activity.button.selector,
  ) as HTMLElement | null
  if (node && !node.dataset[NODE_PROCESSED_DATA_KEY]) {
    node.dataset[NODE_PROCESSED_DATA_KEY] = '1'
    const container = document.createElement('div')
    container.classList.add('SuperSea__Activity')
    injectElement(node, container, selectors.activity.button.injectionMethod)
    injectReact(<Activity />, container)
  }
}

const throttledInjectActivity = _.throttle(injectActivity, 250)

const injectTransferInfo = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()

  const transferForm = document.querySelector(
    selectors.transferInfo.formSelector,
  ) as HTMLElement | null

  const injectionNode = document.querySelector(
    selectors.transferInfo.node.selector,
  )?.parentNode

  if (!injectionNode || !transferForm) return

  const [address] = transferForm?.textContent?.match(/0x[0-9a-fA-F]{40}/) || []
  if (!address || transferForm.dataset[NODE_PROCESSED_DATA_KEY] === address)
    return

  transferForm.dataset[NODE_PROCESSED_DATA_KEY] = address

  let container = document.querySelector('.SuperSea__TransferInfo')

  if (!container) {
    container = document.createElement('div')
    container.classList.add('SuperSea__TransferInfo')
    injectElement(
      injectionNode as HTMLElement,
      container as HTMLElement,
      selectors.transferInfo.node.injectionMethod,
    )
  }

  injectReact(<TransferInfo address={address} />, container)
}

const throttledInjectTransferInfo = _.throttle(injectTransferInfo, 100)

const injectCollectionStats = async () => {
  const { injectionSelectors: selectors } = await fetchRemoteConfig()

  const injectionNode = document.querySelector(
    selectors.collectionStats.node.selector,
  ) as HTMLElement | null

  if (!injectionNode || injectionNode.dataset[NODE_PROCESSED_DATA_KEY]) return
  injectionNode.dataset[NODE_PROCESSED_DATA_KEY] = '1'

  const container = document.createElement('div')
  container.classList.add('SuperSea__CollectionStats')
  injectElement(
    injectionNode as HTMLElement,
    container as HTMLElement,
    selectors.collectionStats.node.injectionMethod,
  )
  const collectionSlug = getLangAgnosticPath().split('/').filter(Boolean)[1]
  injectReact(<CollectionStats collectionSlug={collectionSlug} />, container)
}

const throttledInjectCollectionStats = _.throttle(injectCollectionStats, 100)

const setupInjections = async () => {
  injectBundleVerification()
  injectAssetInfo()
  injectRarityDisclaimer()
  injectCollectionMenu()
  injectCollectionStats()
  injectProfileSummary()
  injectActivity()
  injectTransferInfo()

  const observer = new MutationObserver(() => {
    throttledInjectBundleVerification()
    throttledInjectAssetInfo()
    throttledInjectCollectionMenu()
    throttledInjectCollectionStats()
    throttledDestroyRemovedInjections()
    throttledInjectActivity()
    throttledInjectTransferInfo()
    throttledInjectProfileSummary()
  })

  observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
  })
}

const setupSearchResultsTab = () => {
  const query = queryString.parse(window.location.search)
  if (query.tab === 'supersea') {
    injectSearchResults()
  }
  window.addEventListener('message', (event) => {
    if (event.data.method === 'SuperSea__Next__routeChangeComplete') {
      const query = queryString.parse(event.data.params.url.split('?')[1])
      if (query.tab === 'supersea') {
        injectSearchResults()
      }
    }
  })
}

const initialize = async () => {
  const config = await getExtensionConfig()
  if (config.enabled.opensea) {
    document.body.dataset['superseaPath'] = getLangAgnosticPath()

    setupInjections()
    addGlobalStyle()
    setupAssetInfoRenderer()
    setupSearchResultsTab()
    injectInPageContextScript()
  }
}

initialize()
