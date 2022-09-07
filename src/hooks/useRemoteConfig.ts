import { useEffect, useState } from 'react'
import { fetchRemoteConfig, Marketplace } from '../utils/api'
import {
  HierarchySelector,
  InjectionSelector,
  Selectors,
} from '../utils/selector'

export type RouteConfig = { url: string; as: string }
export type RemoteConfigs = {
  opensea: {
    nextSsrProps: {
      scriptSelector: string
      paths: {
        profileUsername: string
        profileAddress: string
        profileImageUrl: string
      }
    }
    routes: {
      profile: RouteConfig
      searchResults: RouteConfig
      asset: RouteConfig
      collectionFloor: RouteConfig
      traitFloor: RouteConfig
      collection: RouteConfig
    }
    injectionSelectors: Selectors
    queryHeaders: Record<string, string>
    queries: {
      EventHistoryPollQuery: {
        body: string
        staticHeaders: Record<string, string>
        staticVariables: Record<string, any>
        dynamicVariablePaths: {
          collectionSlugs: string
          timestamp: string
          count: string
        }
        resultPaths: {
          edges: string
          asset: string
          listingId: string
          tokenId: string
          contractAddress: string
          sellerAddress: string
          blockExplorerLink: string
          name: string
          collectionName: string
          chain: string
          image: string
          price: string
          currency: string
          timestamp: string
          eventType: string
        }
      }
      EventHistoryQuery: {
        body: string
        staticHeaders: Record<string, string>
        staticVariables: Record<string, any>
        dynamicVariablePaths: {
          collectionSlugs: string
          count: string
        }
        resultPaths: {
          edges: string
          asset: string
          listingId: string
          tokenId: string
          contractAddress: string
          name: string
          collectionName: string
          chain: string
          image: string
          price: string
          currency: string
          timestamp: string
          eventType: string
        }
      }
      AssetSelectionSetPrivacyMutation: {
        body: string
        staticHeaders: Record<string, string>
        staticVariables: Record<string, any>
        dynamicVariablePaths: {
          assets: string
          isPrivate: string
        }
        resultPaths: {
          success: string
        }
      }
    }
  }
  sudoswap: {
    injectionSelectors: {
      assetInfo: {
        grid: {
          node: InjectionSelector
          id: HierarchySelector
          collectionLink: HierarchySelector
          poolLink: HierarchySelector
          image: HierarchySelector
        }
        item: {
          node: InjectionSelector
          image: HierarchySelector
        }
      }
      sudonautRoyalties: {
        item: {
          node: InjectionSelector
        }
        list: {
          node: InjectionSelector
        }
      }
    }
    routes: {
      traitFloor: RouteConfig
    }
  }
  gem: {
    injectionSelectors: {
      assetInfo: {
        grid: {
          node: InjectionSelector
          link: HierarchySelector
          image: HierarchySelector
        }
        item: {
          node: InjectionSelector
          image: HierarchySelector
        }
      }
    }
    routes: {
      traitFloor: RouteConfig
    }
  }
}

const useRemoteConfig = <T extends Marketplace = 'opensea'>(
  marketplace: T = 'opensea' as T,
) => {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfigs[T] | null>(
    null,
  )
  useEffect(() => {
    ;(async () => {
      const remoteConfig = await fetchRemoteConfig(marketplace)
      setRemoteConfig(remoteConfig)
    })()
  }, [marketplace])
  return remoteConfig
}

export default useRemoteConfig
