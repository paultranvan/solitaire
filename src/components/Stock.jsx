import React, { Component } from "react"
import PropTypes from "prop-types"

class Stock extends Component {
  render() {
    const { renderTopCard, cards, onClick } = this.props
    return <div>{renderTopCard(cards, onClick)}</div>
  }
}

Stock.propTypes = {
  cards: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired,
  renderTopCard: PropTypes.func.isRequired
}

export default Stock
