import React from 'react'
import { Types } from '../lib/consts'
import { useDrop } from 'react-dnd'
import { connect } from 'react-redux'
import Card from './Card'
import Empty from './Empty'
import { moveCard } from '../redux/actions/actions'
import { isSingleCardDrop } from '../redux/helpers'


const mapStateToProps = (state) => {
  const { cards } = state
  return { canDropInFoundation: (item) => isSingleCardDrop(cards, item) }
}


const mapDispatchToProps = dispatch => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, { type: Types.FOUNDATIONS, id }))
    }
  }
}

const Foundation = ({ id, cards, dropCard, canDropInFoundation }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: Types.CARD,
    //canDrop: () =>  //compare incoming card and topcard + its origin
    drop: item => dropCard(id, item),
    canDrop: item => {
      return canDropInFoundation(item)
    },
    collect: monitor => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  })

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null

  return (
    <div
      ref={drop}
    >
      {topCard ? (
        <Card
          id={topCard.id}
          value={topCard.value}
          color={topCard.color}
          container={{
            type: Types.FOUNDATIONS,
            id: id,
            position: cards.length - 1
          }}
          isOver={isOver}
        />
      ) : (
        <Empty isOver={isOver} />
      )}
    </div>
  )
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Foundation)
