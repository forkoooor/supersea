import ReactDOM from 'react-dom'
import GlobalStyles from '../components/GlobalStyles'
import AppProvider from '../components/AppProvider'
import { fetchGlobalCSS, Marketplace } from '../utils/api'
import AssetInfo from '../components/AssetInfo/AssetInfo'

export const NODE_PROCESSED_DATA_KEY = '__SuperSea__Processed'

export const addGlobalStyle = (marketplace: Marketplace = 'opensea') => {
  const globalContainer = document.createElement('div')
  document.body.appendChild(globalContainer)
  injectReact(<GlobalStyles />, globalContainer)
  fetchGlobalCSS(marketplace).then((css) => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  })
}

export const setupAssetInfoRenderer = () => {
  const render = () => {
    try {
      const selectedNodes = document.querySelectorAll(
        '.SuperSea__AssetInfo--Unrendered',
      )
      if (selectedNodes.length !== 0) {
        const nodes = [...Array.from(selectedNodes)] as HTMLElement[]
        nodes.forEach((node: HTMLElement) => {
          const {
            address,
            sudoswapPoolAddress,
            tokenId,
            chain,
            type,
            collectionSlug,
            marketplace,
          } = node.dataset as any
          node.parentElement?.classList.add('SuperSea__AssetInfo--Injected')
          injectReact(
            <AssetInfo
              address={address}
              sudoswapPoolAddress={sudoswapPoolAddress}
              tokenId={tokenId}
              chain={chain}
              type={type}
              marketplace={marketplace || 'opensea'}
              collectionSlug={collectionSlug}
              container={node.parentElement!}
            />,
            node,
          )
          node.classList.remove('SuperSea__AssetInfo--Unrendered')
        })
      }
    } catch (err) {
      console.error('AssetInfo inject error', err)
    }
    setTimeout(() => {
      window.requestIdleCallback(render, { timeout: 500 })
    }, 250)
  }
  window.requestIdleCallback(render, { timeout: 500 })
}

let injectedReactContainers: ReactDOM.Container[] = []
export const injectReact = (
  content: React.ReactElement,
  target: ReactDOM.Container,
  opts?: { callback?: () => void; autoDestroy?: boolean },
) => {
  if (opts?.autoDestroy !== false) {
    injectedReactContainers.push(target)
  }
  ReactDOM.render(<AppProvider>{content}</AppProvider>, target, opts?.callback)
}

let cleanupActive = true
export const destroyRemovedInjections = () => {
  window.requestIdleCallback(() => {
    if (!cleanupActive) return
    injectedReactContainers = injectedReactContainers.filter((container) => {
      if (!document.body.contains(container)) {
        ReactDOM.unmountComponentAtNode(container as Element)
        container.parentElement?.classList.remove(
          'SuperSea__AssetInfo--Injected',
        )
        return false
      }
      return true
    })
  })
}

export const setCleanupActive = (value: boolean) => {
  cleanupActive = value
}
