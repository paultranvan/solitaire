import {
  GET_FROM_STOCK,
  MOVE_CARD,
  MOVE_COLUMN_CARD,
  REFILL_STOCK,
  REVEAL_LAST_COLUMN_CARD
} from '../actions/types'
import { Types } from '../../lib/consts'
import { getColumnChildCards } from '../helpers'

const moveCard = (state, card, destination) => {
  console.log('move card : ', card, ' to ', destination)
  const sourceType = card.container.type
  const targetType = destination.type

  let cards = [card]
  if (sourceType === Types.COLUMNS) {
    cards = getColumnChildCards(state, card)
    console.log("cards column : ", cards)
  }

  // The source can be talon, column or foundation
  let sourceCards = [...state[sourceType]]
  if (card.container.hasOwnProperty('id')) {
    let sourceContainer = sourceCards[card.container.id]
    console.log('source container : ', sourceContainer)
    console.log('cards length : ', cards.length)
    sourceCards[card.container.id].splice(sourceCards[card.container.id].length - cards.length)
  } else {
    sourceCards.splice(sourceCards.length - 1)
  }

  // The target is either a column, or a foundation
  const targetCards = [...state[targetType]]
  console.log('old target : ', targetCards[destination.id])
  const newTarget = [...targetCards[destination.id], ...cards]
  console.log('new target : ', newTarget)
  targetCards[destination.id] = newTarget
  return { ...state, [sourceType]: sourceCards, [targetType]: targetCards }
}

const moveColumnCards = (state, cards, destination) => {
  console.log('move column cards : ', cards, ' to ', destination)
  const sourceColumnId = cards[0].container.id
  const newSourceColumn = [...state.columns[sourceColumnId]]
  newSourceColumn.slice(0, cards[0].container.position)

  const targetColumn = [...state.columns[destination.id]]
  const newTargetColumn = [...targetColumn, cards]
  console.log('target column : ', newTargetColumn)

  const newColumns = [...state.columns]
  newColumns[sourceColumnId] = newSourceColumn
  newColumns[destination.id] = newTargetColumn
  return { ...state, columns: newColumns }
}

const getCardFromStock = state => {
  const topStock = state.stock[state.stock.length - 1]
  const stock = state.stock.splice(0, state.stock.length - 1)
  const talon = [...state.talon, topStock]
  return { ...state, stock, talon }
}

const refillStock = state => {
  const stock = [...state.talon]
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
  console.log('enter reducer card with action ', action.type)
  switch (action.type) {
    case MOVE_CARD:
      return moveCard(state, action.card, action.destination)
    case MOVE_COLUMN_CARD:
      return moveColumnCards(state, action.cards, action.destination)
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
