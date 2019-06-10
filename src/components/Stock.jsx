import React from "react"
import { connect } from 'react-redux'
import { getFromStock } from '../actions/actions'
import Card from './Card'


const Stock = ({ stock, getFromStock }) => {
  const topCard = stock[stock.length - 1]

  return(
    <div>
      <Card
        id={topCard.id}
        value={topCard.value}
        color={topCard.color}
        onClick={() => getFromStock()}
      />
    </div>
  )
}

export default connect(null, { getFromStock })(Stock)
