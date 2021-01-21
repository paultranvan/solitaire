import React from 'react'
import { connect } from 'react-redux'
import { getFromStock, refillStock } from '../redux/actions/actions'
import { Types } from '../game/consts'
import Card from './Card'
import Empty from './Empty'

const mapDispatchToProps = (dispatch) => {
  return {
    getFromStock: () => dispatch(getFromStock()),
    refillStock: () => dispatch(refillStock())
  }
}

const Stock = ({ stock, getFromStock, refillStock }) => {
  const topCard = stock.length > 0 ? stock[stock.length - 1] : null

  return topCard ? (
    <div id="stock">
      <Card
        id={topCard.id}
        value={topCard.value}
        color={topCard.color}
        visible={false}
        container={{ type: Types.STOCK }}
        onClick={getFromStock}
      />
    </div>
  ) : (
    <Empty onClick={refillStock} height="100%" />
  )
}

export default connect(null, mapDispatchToProps)(Stock)
