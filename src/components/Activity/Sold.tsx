import {
  useColorModeValue,
  HStack,
  Spinner,
  Box,
  Text,
  Link,
  Tooltip,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Sale } from '../../hooks/useActivity'
import { readableGweiValue } from '../../utils/ethereum'
import { fetchTransaction } from '../../utils/web3'

const Sold = ({ sale }: { sale: Sale }) => {
  const [salePriorityFee, setSalePriorityFee] = useState<
    number | null | undefined
  >(undefined)

  const color = useColorModeValue('red.500', 'red.400')

  useEffect(() => {
    ;(async () => {
      const startTime = Date.now()
      if (!sale.hash) return
      const tx = await fetchTransaction(sale.hash)
      if (!tx) return
      const gasPrice = +tx.gasPrice
      const maxFeePerGas = +tx.maxFeePerGas
      const maxPriorityFeePerGas = +tx.maxPriorityFeePerGas
      const priorityFee = maxPriorityFeePerGas
        ? Math.min(maxFeePerGas || 0, maxPriorityFeePerGas)
        : gasPrice

      setTimeout(() => {
        setSalePriorityFee(priorityFee)
      }, Math.max(0, 750 - (Date.now() - startTime)))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.hash])

  return (
    <Tooltip
      label={
        <Box maxWidth="200px">
          <Text>
            Listing sold with the winning transaction paying{' '}
            <strong>
              {salePriorityFee
                ? `${readableGweiValue(salePriorityFee)} gwei`
                : 'N/A'}
            </strong>{' '}
            in priority fee.
          </Text>
        </Box>
      }
      fontSize="xs"
      hasArrow
      bg="gray.800"
      borderRadius="md"
      placement="top"
      color="white"
      px="3"
      py="2"
    >
      <HStack
        as={Link}
        href={`https://sniped.lol/assets/${sale.chain}/${
          sale.contractAddress
        }/${sale.tokenId}${sale.hash ? `?tx=${sale.hash.slice(2, 8)}` : ''}`}
        borderRadius="md"
        border="1px solid"
        borderColor={color}
        color={color}
        animation="SuperSea__FadeIn 350ms ease"
        target="_blank"
        spacing="0"
        py="1"
        fontWeight="bold"
        justifyContent="center"
        textAlign="center"
        overflow="hidden"
        minWidth="70px"
        position="relative"
      >
        <Box
          width="100%"
          position="absolute"
          transition="all 250ms ease"
          opacity={salePriorityFee ? 0 : 1}
          transform={
            salePriorityFee
              ? 'translateX(-100%) translateX(-15px)'
              : 'translateX(0)'
          }
        >
          <Text m="0" fontSize="11px">
            Sold <Spinner width="8px" height="8px" thickness="1px" ml="0.5" />
          </Text>
        </Box>
        <Text
          m="0"
          fontSize="11px"
          display="inline-block"
          transition="all 250ms ease"
          opacity={salePriorityFee ? 1 : 0}
          transform={
            salePriorityFee
              ? 'translateX(0)'
              : 'translateX(100%) translateX(15px)'
          }
        >
          {salePriorityFee
            ? `${readableGweiValue(salePriorityFee)} gwei`
            : 'N/A'}
        </Text>
      </HStack>
    </Tooltip>
  )
}

export default Sold
