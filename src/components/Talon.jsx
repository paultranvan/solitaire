import React from "react"
import { Types } from "../lib/consts"
import { connect } from 'react-redux'
import Card from './Card'
import Empty from './Empty'


const Talon = ({ cards }) => {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null

  return topCard
    ? (
        <div>
          <Card
            id={topCard.id}
            value={topCard.value}
            color={topCard.color}
            position={{type: Types.TALON}}
          />
        </div>
      )
    : (
      <Empty />
    )
}

export default connect(null, null)(Talon)
