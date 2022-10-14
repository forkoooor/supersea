import { RouteConfig } from '../hooks/useRemoteConfig'

const interpolate = (str: string, variables: Record<string, string>) => {
  return str.replace(/\{([^}]+)\}/g, (_, key) => {
    return variables[key]
  })
}

export const createRouteParams = (
  routeConfig: RouteConfig,
  params?: Record<string, string>,
) => {
  return {
    url: interpolate(routeConfig.url, params || {}),
    as: interpolate(routeConfig.as, params || {}),
  }
}

export const getLangAgnosticPath = () => {
  const lang = document.querySelector('html')?.getAttribute('lang')
  if (lang) {
    const regex = new RegExp(`^/(${lang}|es|ja|fr|zh-CN)/`)
    return window.location.pathname.replace(regex, '/')
  }
  return window.location.pathname
}
