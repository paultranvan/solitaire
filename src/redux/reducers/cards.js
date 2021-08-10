import {
  GET_FROM_STOCK,
  MOVE_CARD,
  REFILL_STOCK,
  REVEAL_LAST_COLUMN_CARD
} from '../actions/types'
import { Types } from '../../game/consts'
import { getColumnChildCards } from '../helpers'

const moveCard = (state, card, destination) => {
  const sourceType = card.container.type
  const targetType = destination.type

  let cards = [card]
  if (sourceType === Types.COLUMNS) {
    cards = getColumnChildCards(state, card)
  }

  // The source can be talon, column or foundation
  let sourceCards = [...state[sourceType]]
  if (
    card.container.type === Types.COLUMNS ||
    card.container.type === Types.FOUNDATION
  ) {
    sourceCards[card.container.id].splice(
      sourceCards[card.container.id].length - cards.length
    )
  } else {
    sourceCards.splice(sourceCards.length - 1)
  }

  // The target is either a column, or a foundation
  const targetCards = [...state[targetType]]
  const newTarget = [...targetCards[destination.id], ...cards]
  targetCards[destination.id] = newTarget

  return { ...state, [sourceType]: sourceCards, [targetType]: targetCards }
}

const getCardFromStock = (state) => {
  const topStock = state.stock[state.stock.length - 1]
  const stock = state.stock.splice(0, state.stock.length - 1)
  const talon = [...state.talon, topStock]
  return { ...state, stock, talon }
}

const refillStock = (state) => {
  const stock = [...state.talon].reverse()
  const talon = []
  return { ...state, stock, talon }
}

const revealLastColumnCard = (state, columnId) => {
  const newColumns = [...state[Types.COLUMNS]]
  const column = [...newColumns[columnId]]
  column[column.length - 1].visible = true
  newColumns[columnId] = column
  return { ...state, columns: newColumns }
}

const cards = (state = {}, action) => {
  //console.log('cards reducer : ', state)
  //console.log('enter reducer card with action ', action.type)
  switch (action.type) {
    case MOVE_CARD:
      return moveCard(state, action.card, action.destination)
    case GET_FROM_STOCK:
      return getCardFromStock(state)
    case REFILL_STOCK:
      return refillStock(state)
    case REVEAL_LAST_COLUMN_CARD:
      return revealLastColumnCard(state, action.columnId)
    default:
      return state
  }
}

export default cards
