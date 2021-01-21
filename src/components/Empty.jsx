import React from 'react'
import { Segment } from 'semantic-ui-react'

const Empty = ({ canDrop, onClick }) => {
  const stock = document.getElementById('stock')
  const height = stock ? stock.clientHeight : '100%'
  console.log('height : ', height)
  return (
    <Segment
      style={{
        height: height,
        backgroundColor: canDrop ? 'green' : 'white'
      }}
      onClick={onClick}
    ></Segment>
  )
}

export default Empty
