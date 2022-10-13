import React from 'react'
import {
  Box,
  Flex,
  HStack,
  Text,
  Tooltip,
  useToken,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import useBlockSecond from '../../hooks/useBlockSecond'

const AnimatedProgress = React.memo(
  ({
    animationActive,
    blockSecond,
  }: {
    animationActive: boolean
    blockSecond: number
  }) => {
    return (
      <circle
        r="11"
        cx="15"
        cy="15"
        strokeDasharray={Math.ceil(Math.PI * 24)}
        strokeDashoffset={0}
        fill="transparent"
        strokeWidth="3"
        style={{
          animation: animationActive
            ? `SuperSea__BlockTimerStroke 12s ${1 - blockSecond}s linear`
            : 'none',
        }}
      />
    )
  },
  (prevProps, nextProps) => {
    return prevProps.animationActive === nextProps.animationActive
  },
)

const BlockTimer = () => {
  const blockSecond = useBlockSecond()
  const [animationActive, setAnimationActive] = useState(true)

  const secondsRemaining = 12 - blockSecond

  useEffect(() => {
    if (blockSecond === 0) {
      setAnimationActive(false)
      setTimeout(() => setAnimationActive(true), 100)
    }
  }, [blockSecond])

  return (
    <Tooltip
      hasArrow
      borderRadius="md"
      bg="gray.800"
      placement="top"
      color="white"
      px="3"
      py="2"
      label={
        <Box>
          <Text>
            This timer counts down to when the next block is scheduled to be
            added to the Ethereum blockchain. Any transaction that is pending
            when the timer reaches zero will be considered to be included in
            that block.
          </Text>
          <Text pt="2">
            Note however that there is no strict guarantee that a transaction
            will processed within the same slot it was submitted in, due to gas
            being set too low due to the validator network failing to fill a
            block for that slot.
          </Text>
          <Text pt="2">
            Also note that the correctness of this timer depends on your system
            time being correctly synced.
          </Text>
        </Box>
      }
    >
      <HStack spacing="1.5">
        <Text fontSize="sm" opacity="0.65">
          Block slot timer
        </Text>
        <Box
          position="relative"
          animation={
            blockSecond === 0 ? 'SuperSea__BlockTimerBump 200ms' : 'none'
          }
        >
          <svg
            width="30px"
            height="30px"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              r="11"
              cx="15"
              cy="15"
              fill="transparent"
              strokeWidth="3"
              stroke={useToken(
                'colors',
                useColorModeValue('gray.300', 'gray.600'),
              )}
            />
            <AnimatedProgress
              blockSecond={blockSecond}
              animationActive={animationActive}
            />
          </svg>
          <Flex
            position="absolute"
            width="100%"
            height="100%"
            top="0"
            left="0"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="xs" fontWeight="bold" lineHeight="0">
              {secondsRemaining === 12 ? 0 : secondsRemaining}
            </Text>
          </Flex>
        </Box>
      </HStack>
    </Tooltip>
  )
}

export default BlockTimer
