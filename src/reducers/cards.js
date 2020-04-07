import { GET_FROM_STOCK, MOVE_CARD, REFILL_STOCK, REVEAL_LAST_COLUMN_CARD } from '../actions/types'
import { Types } from "../lib/consts"

const moveCard = (state, card, destination) => {
  console.log('move card : ', card, ' to ', destination)
  const sourceType = card.container.type
  const targetType = destination.type

  // The source can be talon, column or foundation
  const sourceCards = [...state[sourceType]]
  if (card.container.hasOwnProperty('id')) {
    sourceCards[card.container.id].splice(sourceCards[card.container.id].length - 1)
  } else {
    sourceCards.splice(sourceCards.length - 1)
  }

  // The target is either a column, or a foundation
  const targetCards = [...state[targetType]]
  const newTarget = [...targetCards[destination.id], card]
  targetCards[destination.id] = newTarget
  return {...state, [sourceType]: sourceCards, [targetType]: targetCards}
}

const getCardFromStock = (state) => {
  const topStock = state.stock[state.stock.length - 1]
  const stock = state.stock.splice(0, state.stock.length - 1)
  const talon = [...state.talon, topStock]
  return {...state, stock, talon }
}

const refillStock = (state) => {
  const stock = [...state.talon]
  const talon = []
  return {...state, stock, talon}
}

const revealLastColumnCard = (state, columnId) => {
  const newColumns = [...state[Types.COLUMNS]]
  const column = [...newColumns[columnId]]
  column[column.length - 1].visible = true
  newColumns[columnId] = column
  return {...state, columns: newColumns}
}

const cards = (state = {}, action) => {
  console.log('enter reducer card with action ', action.type)
  switch (action.type) {
    case MOVE_CARD:
      return moveCard(state, action.card, action.destination);
    case GET_FROM_STOCK:
      return getCardFromStock(state)
    case REFILL_STOCK:
      return refillStock(state)
    case REVEAL_LAST_COLUMN_CARD:
      return revealLastColumnCard(state, action.columnId)
    default:
      return state
  }
};

export default cards
