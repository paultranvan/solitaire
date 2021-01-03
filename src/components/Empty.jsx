import React from 'react'
import { Segment } from 'semantic-ui-react'

const Empty = ({ canDrop, onClick }) => {
  return (
    <Segment
      style={{ height: 136, width: 116, backgroundColor: canDrop ? 'green' : 'white' }}
      onClick={onClick}
    />
  )
}

export default Empty
