import { GET_FROM_STOCK, MOVE_CARD } from '../actions/types'

function moveCard(state, card, destination) {
  console.log('move card : ', card, ' to ', destination)
  const sourceType = card.position.type
  const targetType = destination.type

  // The source can be talon, column or foundation
  const sourceCards = [...state[sourceType]]
  const newSource = card.position.id
    ? sourceCards[card.position.id].splice(0, sourceCards.length - 1)
    : sourceCards.splice(0, sourceCards.length - 1)

  // The target is either a column, or a foundation
  const targetCards = [...state[targetType]]
  const newTarget = [...targetCards[destination.id], card]
  targetCards[destination.id] = newTarget
  return {...state, [sourceType]: newSource, [targetType]: targetCards}
}

const getCardFromStock = (state) => {
    // TODO should refill stock from talon when no more card
  console.log('get card from stock')
  const topStock = state.stock[state.stock.length - 1]
  const stock = state.stock.splice(0, state.stock.length - 1)
  const talon = [...state.talon, topStock]
  return {...state, stock, talon }
}


const cards = (state = {}, action) => {
  console.log('enter reducer card with action ', action.type)
  switch (action.type) {
    case MOVE_CARD:
      return moveCard(state, action.card, action.destination);
    case GET_FROM_STOCK:
      return getCardFromStock(state)
    case "INIT":
      return state
    default:
      return state
  }
};

export default cards
