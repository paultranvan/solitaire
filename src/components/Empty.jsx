import React from 'react'
import { Segment } from 'semantic-ui-react'

const Empty = ({ canDrop, onClick, height }) => {
  let elementHeight = height
  if (!elementHeight) {
    const stock = document.getElementById('stock')
    elementHeight = stock ? stock.clientHeight : '100%'
  }
  return (
    <Segment
      style={{
        height: elementHeight,
        backgroundColor: canDrop ? 'green' : 'white'
      }}
      onClick={onClick}
    ></Segment>
  )
}

export default Empty
