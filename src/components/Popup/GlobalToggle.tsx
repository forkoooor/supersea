import {
  Switch,
  HStack,
  VStack,
  Text,
  FormControl,
  FormHelperText,
  FormLabel,
} from '@chakra-ui/react'
import { ExtensionConfig } from '../../utils/extensionConfig'

const GlobalToggle = ({
  enabled,
  onChange,
  ...rest
}: {
  enabled: ExtensionConfig['enabled']
  onChange: (enabled: ExtensionConfig['enabled']) => void
} & Omit<React.ComponentProps<typeof FormControl>, 'onChange'>) => {
  return (
    <FormControl {...rest}>
      <FormLabel fontSize="sm">Enable SuperSea</FormLabel>
      <VStack alignItems="flex-start" spacing="2">
        <HStack spacing="2">
          <Switch
            isChecked={enabled.opensea}
            onChange={() => {
              onChange({ ...enabled, opensea: !enabled.opensea })
            }}
          />
          <Text fontSize="sm">on OpenSea</Text>
        </HStack>
        <HStack spacing="2">
          <Switch
            isChecked={enabled.sudoswap}
            onChange={() => {
              onChange({ ...enabled, sudoswap: !enabled.sudoswap })
            }}
          />
          <Text fontSize="sm">on Sudoswap</Text>
        </HStack>{' '}
        <HStack spacing="2">
          <Switch
            isChecked={enabled.gem}
            onChange={() => {
              onChange({ ...enabled, gem: !enabled.gem })
            }}
          />
          <Text fontSize="sm">on Gem</Text>
        </HStack>
      </VStack>
      <FormHelperText color="gray.400">
        Allow SuperSea to inject into web pages.
      </FormHelperText>
    </FormControl>
  )
}

export default GlobalToggle
