import React from "react"
import Card from "./Card"
import { Types } from "../lib/consts"
import { Segment } from "semantic-ui-react"

const isVisible = (cards, card) => {
  return cards.indexOf(card) === cards.length - 1
}

const renderCard = (id, card, className, visible) => {
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

const renderColumn = (id, cards) => {
  if (cards.length === 1) {
    return renderCard(id, cards[0], "Column-card first", true)
  }
  return cards.map((card, i) => {
    const visible = isVisible(cards, card)

    if (i === 0) {
      return renderCard(id, card, "Column-card first", visible)
    } else if (i === cards.length - 1) {
      return renderCard(id, card, "Column-card", visible)
    } else {
      return renderCard(id, card, "Column-card", visible)
    }
  })
}

const Column = ({id, cards}) => {
  return <Segment.Group>{renderColumn(id, cards)}</Segment.Group>
}

export default Column
