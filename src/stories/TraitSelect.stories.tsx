import React, { useState } from 'react'
import { Story } from '@storybook/react'
import { Center, Box } from '@chakra-ui/react'

import TraitSelect from '../components/SearchResults/TraitSelect'

export default {
  title: 'TraitSelect',
  component: TraitSelect,
}

const Template: Story<React.ComponentProps<typeof TraitSelect>> = (args) => {
  const [value, setValue] = useState<string[]>([
    JSON.stringify({
      groupName: 'Canvas Filling',
      value: 'Linear paint roller',
      count: 102,
    }),
  ])

  return (
    <Center height="100%">
      <Box width="300px">
        <TraitSelect {...args} value={value} onChange={setValue} />
      </Box>
    </Center>
  )
}

export const Default = Template.bind({})

Default.args = {
  traits: [
    {
      count: 78,
      trait_type: 'Palette',
      value: 'Burnt Umber',
    },
    {
      count: 42,
      trait_type: 'Final Touch',
      value: 'Black splash',
    },
    {
      count: 77,
      trait_type: 'Palette',
      value: 'Gold Ochre',
    },
    {
      count: 20,
      trait_type: 'Continuity Pairing',
      value: 'Right margin',
    },
    {
      count: 681,
      trait_type: 'Solvent Spills',
      value: 'No',
    },
    {
      count: 938,
      trait_type: 'High Density',
      value: 'No',
    },
    {
      count: 192,
      trait_type: 'Canvas Filling',
      value: 'Top row pouring',
    },
    {
      count: 169,
      trait_type: 'Canvas Filling',
      value: 'Stains',
    },
    {
      count: 630,
      trait_type: 'Frame',
      value: 'None',
    },
    {
      count: 83,
      trait_type: 'Palette',
      value: 'Cadmium Scarlet',
    },
    {
      count: 421,
      trait_type: 'Final Touch',
      value: 'None',
    },
    {
      count: 111,
      trait_type: 'Frame',
      value: 'Medium',
    },
    {
      count: 36,
      trait_type: 'Hole',
      value: 'Yes',
    },
    {
      count: 18,
      trait_type: 'Continuity Pairing',
      value: 'Left margin',
    },
    {
      count: 70,
      trait_type: 'Palette',
      value: 'Pale Ultramarine',
    },
    {
      count: 82,
      trait_type: 'Palette',
      value: 'Naples Orange',
    },
    {
      count: 287,
      trait_type: 'Solvent Spills',
      value: 'Yes',
    },
    {
      count: 40,
      trait_type: 'Palette',
      value: 'Titanium White',
    },
    {
      count: 954,
      trait_type: 'Brush Majoris',
      value: 'No',
    },
    {
      count: 757,
      trait_type: 'Broad brushstrokes',
      value: 'No',
    },
    {
      count: 106,
      trait_type: 'Frame',
      value: 'Narrow',
    },
    {
      count: 14,
      trait_type: 'Brush Majoris',
      value: 'Yes',
    },
    {
      count: 69,
      trait_type: 'Palette',
      value: 'Chromium Oxide Green',
    },
    {
      count: 442,
      trait_type: 'Canvas Filling',
      value: 'Plain color',
    },
    {
      count: 165,
      trait_type: 'Final Touch',
      value: 'Two-tone diluted stains',
    },
    {
      count: 57,
      trait_type: 'Palette',
      value: 'Ivory Black',
    },
    {
      count: 63,
      trait_type: 'Canvas Filling',
      value: 'Rhythmic paint roller',
    },
    {
      count: 73,
      trait_type: 'Palette',
      value: 'Indian Yellow',
    },
    {
      count: 121,
      trait_type: 'Frame',
      value: 'Wide',
    },
    {
      count: 59,
      trait_type: 'Final Touch',
      value: 'White splash',
    },
    {
      count: 102,
      trait_type: 'Canvas Filling',
      value: 'Linear paint roller',
    },
    {
      count: 211,
      trait_type: 'Broad brushstrokes',
      value: 'Yes',
    },
    {
      count: 932,
      trait_type: 'Hole',
      value: 'No',
    },
    {
      count: 136,
      trait_type: 'Final Touch',
      value: 'White flourish',
    },
    {
      count: 145,
      trait_type: 'Final Touch',
      value: 'Paint brushes',
    },
    {
      count: 70,
      trait_type: 'Palette',
      value: 'Charcoal Light Grey + Indigo Blue',
    },
    {
      count: 17,
      trait_type: 'Palette',
      value: 'Prussian Blue',
    },
    {
      count: 70,
      trait_type: 'Palette',
      value: 'Pale Sienna',
    },
    {
      count: 69,
      trait_type: 'Palette',
      value: 'Manganese Blue + Crimson Red',
    },
    {
      count: 86,
      trait_type: 'Palette',
      value: 'Cobalt Turquoise',
    },
    {
      count: 930,
      trait_type: 'Continuity Pairing',
      value: 'Both margins',
    },
    {
      count: 15,
      trait_type: 'Palette',
      value: 'Zinc White + Lamp Black',
    },
    {
      count: 12,
      trait_type: 'Palette',
      value: 'Greek Terracota',
    },
    {
      count: 30,
      trait_type: 'High Density',
      value: 'Yes',
    },
  ],
}
