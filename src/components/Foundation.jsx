import React from "react"
import { Types } from "../lib/consts"
import { useDrop } from 'react-dnd'
import { connect } from 'react-redux'
import Card from "./Card"
import Empty from './Empty'
import { moveCard } from '../actions/actions'

const mapDispatchToProps = dispatch => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, {type: Types.FOUNDATIONS, id}))
    }
  }
}

const Foundation = ({ id, cards, dropCard }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: Types.CARD,
    //canDrop: () => canMoveOnFoundation(), //compare incoming card and topcard + its origin
    drop: (item) => dropCard(id, item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  })

  const topCard = cards.length > 0 ? cards[cards.length - 1] : null

  let color
  if (canDrop && !isOver) {
    color = 'yellow'
  } else if (canDrop && isOver) {
    color = 'green'
  } else {
    color = 'white'
  }
  return (
      <div
        ref={drop}
        style={{
          color: isOver ? 'green' : 'white'
        }}
      >
      {topCard
        ?
          (<Card
            id={topCard.id}
            value={topCard.value}
            color={topCard.color}
            container={{type: Types.FOUNDATIONS, id: id, position: cards.length - 1}}
          />)
        :
          (<Empty color={color}/>)
      }
      </div>
    )

}

export default connect(null, mapDispatchToProps)(Foundation)
