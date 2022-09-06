import { Button } from '@chakra-ui/button'
import { Flex } from '@chakra-ui/layout'
import Logo from './Logo'

const SudonautRoyalties = ({
  poolAddress,
  type,
}: {
  poolAddress: string
  type: 'item' | 'list'
}) => {
  return (
    <Flex
      height="100%"
      width="100%"
      justifyContent="flex-end"
      alignItems="center"
      px={type === 'list' ? '3' : '0'}
      pt={type === 'list' ? '5' : '0'}
    >
      <Button
        as="a"
        href={`https://sudonaut.xyz/pool/${poolAddress}`}
        target="_blank"
        leftIcon={<Logo width="20px" height="20px" color="white" />}
        color="white"
        iconSpacing="2"
        bg="gray.700"
        fontSize="14px"
        fontWeight="400"
        height="35px"
        _hover={{ bg: 'gray.600', color: 'white' }}
        _active={{ bg: 'gray.500', color: 'white' }}
      >
        Pay Royalties
      </Button>
    </Flex>
  )
}

export default SudonautRoyalties
