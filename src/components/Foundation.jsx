import React, { Component } from "react"
import PropTypes from "prop-types"
import { Types } from "../lib/consts"
import { DropTarget } from "react-dnd"
import { moveCard } from "../actions/index"

const foundationTarget = {
  drop(props, monitor, component) {
    const src = monitor.getItem().card
    console.log("Droped ! ")
    console.log("item source : ", src)
    console.log("item dest : ", JSON.stringify(component.props.cards))
    moveCard(src, component.props.id)
  },
  canDrop(props, monitor) {
    const item = monitor.getItem()
    console.log("CAN DROP ? ", item.card)
    return true
  }
}

function collect(connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  }
}

class Foundation extends Component {
  render() {
    const { renderTopCard, cards, connectDropTarget } = this.props
    return <div>{connectDropTarget(renderTopCard(cards))}</div>
  }
}

Foundation.propTypes = {
  id: PropTypes.number.isRequired,
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired
}

export default DropTarget(Types.TALON, foundationTarget, collect)(Foundation)
