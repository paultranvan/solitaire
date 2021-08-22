import produce from 'immer'
import {
  GET_FROM_STOCK,
  MOVE_CARD,
  REFILL_STOCK,
  REVEAL_LAST_COLUMN_CARD
} from '../actions/types'
import { Types } from '../../game/consts'
import { getColumnChildCards } from '../helpers'

const revealLastColumnCard = (state, columnId) => {
  const columnCards = state[Types.COLUMNS][columnId]
  if (columnCards.length > 0) {
    columnCards[columnCards.length - 1].visible = true
  }
}

// XXX - We use immer to update state to ease state mutations
// When doing a mutation on a nested level, all involved levels must be
// shallow copied, as it keeps references.
// See https://redux.js.org/usage/structuring-reducers/immutable-update-patterns

const moveCard = (state, card, destination) => {
  const sourceType = card.container.type
  const targetType = destination.type

  let cards = [card]
  if (sourceType === Types.COLUMNS) {
    cards = getColumnChildCards(state, card)
  }

  return produce(state, (draft) => {
    if (sourceType === Types.COLUMNS || sourceType === Types.FOUNDATION) {
      // Remove card from column or foundation
      draft[sourceType][card.container.id].splice(
        draft[sourceType][card.container.id].length - cards.length
      )
    } else {
      // Remove card from stock
      draft[sourceType].splice(draft[sourceType].length - 1)
    }

    // Add card to destination
    draft[targetType][destination.id].push(...cards)

    // Make last column card visible
    if (sourceType === Types.COLUMNS) {
      revealLastColumnCard(draft, card.container.id)
    }
  })
}

const getCardFromStock = (state) => {
  return produce(state, (draft) => {
    const topStock = draft.stock[draft.stock.length - 1]
    draft.talon.push(topStock)
    draft.stock.pop()
  })
}

const refillStock = (state) => {
  return produce(state, (draft) => {
    draft.stock = draft.talon.reverse()
    draft.talon = []
  })
}

const cards = (state = {}, action) => {
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
