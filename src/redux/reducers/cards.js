import produce from 'immer'
import {
  GET_FROM_STOCK,
  MOVE_CARD,
  REFILL_STOCK,
  REVEAL_LAST_COLUMN_CARD
} from '../actions/types'
import { Types } from '../../game/consts'
import { getColumnChildCards } from '../helpers'

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
    if (
      card.container.type === Types.COLUMNS ||
      card.container.type === Types.FOUNDATION
    ) {
      draft[sourceType][card.container.id].splice(
        draft[sourceType][card.container.id].length - cards.length
      )
    } else {
      draft[sourceType].splice(draft[sourceType].length - 1)
    }
    draft[targetType][destination.id].push(...cards)
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

const revealLastColumnCard = (state, columnId) => {
  return produce(state, (draft) => {
    const column = draft.columns[columnId]
    draft.columns[columnId][column.length - 1].visible = true
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
