import React from "react"
import { connect } from 'react-redux'
import { getFromStock } from '../actions/actions'
import Card from './Card'
import Empty from './Empty'

const Stock = ({ cards, getFromStock }) => {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null

  return topCard
    ? (
        <div>
          <Card
            id={topCard.id}
            value={topCard.value}
            color={topCard.color}
            visible={false}
            onClick={() => getFromStock() }
          />
        </div>
      )
    : (
      <Empty />
    )
}

export default connect(null, { getFromStock })(Stock)
