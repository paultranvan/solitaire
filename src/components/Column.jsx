import React, { useEffect } from "react"
import { connect } from 'react-redux'
import { moveCard, revealLastColumnCard } from '../actions/actions'
import Card from "./Card"
import { Types } from "../lib/consts"
import { Segment } from "semantic-ui-react"
import { useDrop } from 'react-dnd'

const mapDispatchToProps = dispatch => {
  return {
    dropCard: (id, card) => {
      console.log('go drop card in column')
      dispatch(moveCard(card, {type: Types.COLUMNS, id}))
    },
    makeLastCardVisible: (id) => {
      dispatch(revealLastColumnCard(id))
    }
  }
}

const renderCard = (id, card, position, className) => {
  return (
    <div
      key={card.id}
      className={position === 0 ? "Column-card first" : "Column-card"}
    >
      <Card
        value={card.value}
        color={card.color}
        visible={!!card.visible}
        container={{type: Types.COLUMNS, id, position}}
      />
    </div>
  )
}

const renderColumn = (id, cards) => {
  return cards.map((card, i) => {
    return renderCard(id, card, i)
  })
}

const Column = ({id, cards, dropCard, makeLastCardVisible}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: Types.CARD,
    drop: (item) => dropCard(id, item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })

  useEffect(() => {
    // Make last column cards visible
    if (cards.length > 0 && !cards[cards.length - 1].visible) {
      makeLastCardVisible(id)
    }
  })

  return (
      <Segment.Group>
        <div
          ref={drop}
        >
          {renderColumn(id, cards)}
        </div>
      </Segment.Group>
  )
}

export default connect(null, mapDispatchToProps)(Column)
