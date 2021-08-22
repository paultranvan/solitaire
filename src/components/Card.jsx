import React from 'react'
import { Segment, Image } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { useDrag } from 'react-dnd'
import { Types } from '../game/consts'
import { isLastContainerCard } from '../redux/helpers'
import { findAutoMoveTarget } from '../game/game'
import { moveCard } from '../redux/actions/actions'

const mapStateToProps = (state, ownProps) => {
  const game = state.game
  const cards = state.cards.present
  return {
    isLastCard: isLastContainerCard(cards, ownProps),
    findTarget: () => {
      return findAutoMoveTarget(cards, game, ownProps)
    }
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    autoMoveCard: (card, target) => {
      dispatch(moveCard(card, target))
    }
  }
}

const Card = ({
  value,
  color,
  container,
  visible = true,
  onClick,
  children,
  canDrop,
  isLastCard, // useful to avoid highlight the whole column
  findTarget,
  autoMoveCard
}) => {
  const [{ isDragging }, drag] = useDrag({
    item: { type: Types.CARD, value, color, container },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    }),
    canDrag: () => {
      return visible
    }
  })

  const style = {
    backgroundColor: 'green'
  }

  const cardPath = visible
    ? './assets/cards/' + color + '_' + value + '.png'
    : './assets/cards/card_back.png'

  const autoMove = () => {
    const card = { value, color, container }
    const target = findTarget(card)
    if (target) {
      autoMoveCard(card, target)
    }
  }

  const fireOnClick = () => {
    if (onClick) {
      return onClick()
    }
    if (container.type === Types.COLUMNS || container.type === Types.TALON) {
      return autoMove()
    }
    return
  }

  // TODO: use classname instead of segment style
  // TODO: change card size depending on screen size
  // TODO : segment renders better, but is not/less responsive than just item...
  return (
    <div
      ref={drag}
      style={{
        cursor: 'move',
        opacity: isDragging ? 0.1 : 1,
        border: isDragging ? '3px dashed gray' : 'none'
      }}
    >
      <Segment style={canDrop && isLastCard ? style : null}>
        <Image
          className="test"
          src={cardPath}
          rounded
          onClick={fireOnClick}
          size="tiny"
        />
      </Segment>
      {children}
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Card)
