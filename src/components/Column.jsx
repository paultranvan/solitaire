import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import {
  moveCard,
  moveColumnCards,
  revealLastColumnCard
} from '../actions/actions'
import Card from './Card'
import { Types } from '../lib/consts'
import { Segment } from 'semantic-ui-react'
import { useDrop, useDrag } from 'react-dnd'

const mapDispatchToProps = dispatch => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, { type: Types.COLUMNS, id }))
    },
    dropColumnCards: (id, cards) => {
      console.log('move cards : ', cards)
      dispatch(moveColumnCards(cards, { type: Types.COLUMNS, id }))
    },
    makeLastCardVisible: id => {
      dispatch(revealLastColumnCard(id))
    }
  }
}

const renderCard = (id, card, position) => {
  return (
    <div
      key={card.id}
      className={position === 0 ? 'Column-card first' : 'Column-card'}
    >
      <Card
        value={card.value}
        color={card.color}
        visible={!!card.visible}
        container={{ type: Types.COLUMNS, id, position }}
      />
    </div>
  )
}

const renderColumn = (id, cards) => {
  return cards.map((card, i) => {
    return renderCard(id, card, i)
  })
}

const Column = ({
  id,
  cards,
  dropCard,
  dropColumnCards,
  makeLastCardVisible
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [Types.CARD, Types.COLUMN],
    drop: item =>
      item.type === Types.COLUMN
        ? dropColumnCards(id, item.cards)
        : dropCard(id, item),
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  })
  const [{ isDragging }, drag] = useDrag({
    item: { type: Types.COLUMN, cards }, //TODO: this drag the whole column
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    })
  })

  useEffect(() => {
    // Make last column cards visible
    if (cards.length > 0 && !cards[cards.length - 1].visible) {
      makeLastCardVisible(id)
    }
  })

  return (
    <Segment.Group>
      <div ref={drop}>
        <div ref={drag}>{renderColumn(id, cards)}</div>
      </div>
    </Segment.Group>
  )
}

export default connect(
  null,
  mapDispatchToProps
)(Column)
