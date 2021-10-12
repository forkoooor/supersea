export type ExtensionConfig = {
  enabled: boolean
  quickBuyEnabled: boolean
}

const DEFAULTS: ExtensionConfig = {
  enabled: true,
  quickBuyEnabled: false,
}

let configPromise: null | Promise<Record<string, any>> = null
export const getExtensionConfig = async () => {
  if (!configPromise) {
    configPromise = new Promise((resolve) => {
      if (process.env.NODE_ENV === 'production') {
        chrome.storage.local.get(['extensionConfig'], resolve)
      } else {
        setTimeout(() => resolve({}), 250)
      }
    })
  }
  const val = await configPromise
  return val?.extensionConfig || DEFAULTS
}

export const saveExtensionConfig = (config: ExtensionConfig) => {
  if (process.env.NODE_ENV === 'production') {
    chrome.storage.local.set({ extensionConfig: config })
  }
}
