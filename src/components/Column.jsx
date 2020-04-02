import React, { Component } from "react"
import PropTypes from "prop-types"
import Card from "./Card"
import { Types } from "../lib/consts"
import { Segment } from "semantic-ui-react"

class Column extends Component {
  isVisible(cards, card) {
    return cards.indexOf(card) === cards.length - 1
  }

  renderCard = (id, card, className, visible) => {
    return (
      <div key={card.id} className={className}>
        <Card
          id={card.id}
          value={card.value}
          color={card.color}
          visible={visible}
          position={{type: Types.COLUMNS, id}}
        />
      </div>
    )
  }

  renderColumn = () => {
    const { cards, id } = this.props

    if (cards.length === 1) {
      return this.renderCard(id, cards[0], "Column-card first", true)
    }

    return cards.map((card, i) => {
      const visible = this.isVisible(cards, card)

      if (i === 0) {
        return this.renderCard(id, card, "Column-card first", visible)
      } else if (i === cards.length - 1) {
        return this.renderCard(id, card, "Column-card", visible)
      } else {
        return this.renderCard(id, card, "Column-card", visible)
      }
    })
  }

  render() {
    return <Segment.Group>{this.renderColumn()}</Segment.Group>
  }
}

Column.propTypes = {
  cards: PropTypes.array.isRequired,
  id: PropTypes.number.isRequired
}

export default Column
