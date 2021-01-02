import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import {
  moveCard,
  moveColumnCards,
  revealLastColumnCard
} from '../redux/actions/actions'
import Card from './Card'
import Empty from './Empty'
import { Types } from '../lib/consts'
import { Segment } from 'semantic-ui-react'
import { useDrop } from 'react-dnd'

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

const renderCard = (id, card, position, isOver, children) => {
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
        isOver={isOver}
      >
      {children}
      </Card>
    </div>
  )
}

const buildColumn = (id, cards, isOver, children) => {
  if (cards.length < 1) {
    return children
  }
  const lastCard = cards[cards.length -1]
  const newCardsTree = renderCard(id, lastCard, cards.length - 1, isOver, children)
  cards.splice(cards.length - 1)
  return buildColumn(id, cards, isOver, newCardsTree)
}

const renderColumn = (id, cards, isOver) => {
  if (cards.length < 1) {
    return <Empty isOver={isOver} />
  }
  const cardsToRender = [...cards]
  const tree = buildColumn(id, cardsToRender, isOver, null)
  return tree
}

const Column = ({
  id,
  cards,
  dropCard,
  dropColumnCards,
  makeLastCardVisible
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [Types.CARD],
    drop: item =>
      item.type === Types.COLUMN
        ? dropColumnCards(id, item.cards)
        : dropCard(id, item),
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
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
        <div>{renderColumn(id, cards, isOver)}</div>
      </div>
    </Segment.Group>
  )
}

export default connect(
  null,
  mapDispatchToProps
)(Column)
