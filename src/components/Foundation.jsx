import React from 'react'
import { Types } from '../game/consts'
import { useDrop } from 'react-dnd'
import { connect } from 'react-redux'
import Card from './Card'
import Empty from './Empty'
import { moveCard } from '../redux/actions/actions'
import { isSingleCardDrop } from '../redux/helpers'
import { canPlayInFoundation } from '../game/game'

const mapStateToProps = (state, ownProps) => {
  const { cards, game } = state
  return {
    canDropInFoundation: (item) =>
      isSingleCardDrop(cards, item) &&
      canPlayInFoundation(cards, game, item, ownProps)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, { type: Types.FOUNDATIONS, id }))
    }
  }
}

const Foundation = ({ id, foundation, dropCard, canDropInFoundation }) => {
  const [{ canDrop }, drop] = useDrop({
    accept: Types.CARD,
    drop: (item) => dropCard(id, item),
    canDrop: (item) => {
      return canDropInFoundation(item)
    },
    collect: (monitor) => ({
      canDrop: !!monitor.canDrop()
    })
  })

  const topCard =
    foundation.length > 0 ? foundation[foundation.length - 1] : null

  return (
    <div ref={drop} className="fullHeight">
      {topCard ? (
        <Card
          id={topCard.id}
          value={topCard.value}
          color={topCard.color}
          container={{
            type: Types.FOUNDATIONS,
            id: id,
            position: foundation.length - 1
          }}
          canDrop={canDrop}
        />
      ) : (
        <Empty canDrop={canDrop} height="100%" />
      )}
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Foundation)
