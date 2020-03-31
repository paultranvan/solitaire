import React from "react"
import { Segment } from 'semantic-ui-react'

const Empty = ({color = 'white'}) => {
  return(
    <Segment style={{ height: 136, width: 116, backgroundColor: color }} />
  )
}

export default Empty
