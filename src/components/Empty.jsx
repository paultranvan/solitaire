import React from 'react'
import { Segment } from 'semantic-ui-react'

const Empty = ({ isOver, onClick }) => {
  return (
    <Segment
      style={{ height: 136, width: 116, backgroundColor: isOver ? 'green' : 'white' }}
      onClick={onClick}
    />
  )
}

export default Empty
