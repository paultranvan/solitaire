import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { useDrop } from 'react-dnd'
import { moveCard, checkGameWon } from '../redux/actions/actions'
import { canPlayInColumn } from '../game/game'
import Card from './Card'
import Empty from './Empty'
import { Types } from '../game/consts'

const mapStateToProps = (state, ownProps) => {
  const game = state.game
  const cards = state.cards.present
  return {
    getAllColumnsCards: () => cards[Types.COLUMNS],
    column: cards[Types.COLUMNS][ownProps.id],
    canDropInColumn: (item) => canPlayInColumn(cards, game, item, ownProps)
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    dropCard: (id, card) => {
      dispatch(moveCard(card, { type: Types.COLUMNS, id }))
    },
    checkGameWon: (columns) => {
      dispatch(checkGameWon(columns))
    }
  }
}

const Column = ({
  id,
  column,
  getAllColumnsCards,
  dropCard,
  canDropInColumn,
  checkGameWon
}) => {
  const [{ canDrop }, drop] = useDrop({
    accept: [Types.CARD],
    drop: (item) => dropCard(id, item),
    collect: (monitor) => ({
      canDrop: !!monitor.canDrop()
    }),
    canDrop: (item) => {
      return canDropInColumn(item)
    }
  })

  const allCards = getAllColumnsCards()
  useEffect(() => {
    checkGameWon(allCards)
  }, [checkGameWon, allCards])

  const renderCard = (card, position, children) => {
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

  const buildColumn = (column, children) => {
    if (column.length < 1) {
      return children
    }
    const lastCard = column[column.length - 1]
    const newCardsTree = renderCard(lastCard, column.length - 1, children)
    column.splice(column.length - 1)
    return buildColumn(column, newCardsTree)
  }

  const renderColumn = () => {
    if (column.length < 1) {
      return <Empty canDrop={canDrop} />
    }
    const columnToRender = [...column]
    const tree = buildColumn(columnToRender, null)
    return tree
  }

  return (
    <div ref={drop}>
      <div>{renderColumn(id, column, canDrop)}</div>
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(Column)
