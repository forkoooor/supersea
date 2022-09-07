import { Link } from '@chakra-ui/react'
import { forwardRef } from 'react'
import useRemoteConfig, { RemoteConfigs } from '../hooks/useRemoteConfig'
import { createRouteParams } from '../utils/route'

const InternalLink = forwardRef(
  <T extends keyof RemoteConfigs['opensea']['routes']>(
    {
      route,
      params,
      routeOptions,
      onClick,
      ...rest
    }: React.ComponentProps<typeof Link> & {
      route: T
      params?: Record<string, string>
      onClick?: () => void
      routeOptions?: any
    },
    ref: React.Ref<any>,
  ) => {
    const remoteConfig = useRemoteConfig()

    return (
      <Link
        {...rest}
        ref={ref}
        href={
          remoteConfig
            ? createRouteParams(remoteConfig.routes[route], params).as
            : undefined
        }
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || !remoteConfig) return
          const routeParams = createRouteParams(
            remoteConfig.routes[route],
            params,
          )
          // Not internal link
          if (routeParams.as[0] !== '/') return
          event.preventDefault()
          window.postMessage({
            method: 'SuperSea__Navigate',
            params: {
              ...routeParams,
              options: routeOptions,
            },
          })
          onClick && onClick()
        }}
      />
    )
  },
)

export default InternalLink
