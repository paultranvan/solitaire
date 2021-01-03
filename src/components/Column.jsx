import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import {
  moveCard,
  revealLastColumnCard
} from '../redux/actions/actions'
import { canPlayInColumn } from '../redux/game'
import Card from './Card'
import Empty from './Empty'
import { Types } from '../lib/consts'
import { Segment } from 'semantic-ui-react'
import { useDrop } from 'react-dnd'

const mapStateToProps = (state, ownProps) => {
  const { cards } = state
  return { canDropInColumn: (item) => canPlayInColumn(cards, item, ownProps) }
}

const mapDispatchToProps = dispatch => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, { type: Types.COLUMNS, id }))
    },
    makeLastCardVisible: id => {
      dispatch(revealLastColumnCard(id))
    }
  }
}

const renderCard = (id, card, position, canDrop, children) => {
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
        canDrop={canDrop}
      >
      {children}
      </Card>
    </div>
  )
}

const buildColumn = (id, cards, canDrop, children) => {
  if (cards.length < 1) {
    return children
  }
  const lastCard = cards[cards.length -1]
  const newCardsTree = renderCard(id, lastCard, cards.length - 1, canDrop, children)
  cards.splice(cards.length - 1)
  return buildColumn(id, cards, canDrop, newCardsTree)
}

const renderColumn = (id, cards, canDrop) => {
  if (cards.length < 1) {
    return <Empty canDrop={canDrop} />
  }
  const cardsToRender = [...cards]
  const tree = buildColumn(id, cardsToRender, canDrop, null)
  return tree
}

const Column = ({
  id,
  cards,
  dropCard,
  makeLastCardVisible,
  canDropInColumn
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [Types.CARD],
    drop: item => dropCard(id, item),
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    }),
    canDrop: item => canDropInColumn(item)
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
        <div>{renderColumn(id, cards, canDrop)}</div>
      </div>
    </Segment.Group>
  )
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Column)
