import React, { Component } from "react"
import PropTypes from "prop-types"
import { Types } from "../lib/consts"
import { DragSource } from "react-dnd"

const talonSource = {
  beginDrag(props) {
    const card = props.cards[props.cards.length - 1]
    return { card }
  }
}

function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

class Talon extends Component {
  render() {
    const { renderTopCard, cards, connectDragSource } = this.props
    return <div>{connectDragSource(renderTopCard(cards))}</div>
  }
}

Talon.propTypes = {
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired
}

export default DragSource(Types.TALON, talonSource, collect)(Talon)
