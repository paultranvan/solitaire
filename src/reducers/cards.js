import { GET_FROM_STOCK, MOVE_CARD } from '../actions/types'

function moveCard(state, card, destination) {
  // Add card to target
  // TODO: support other than foundation
  console.log('move card : ', card, ' to ', destination)
  const foundations = [...state.foundations]
  const newFoundation = [...state.foundations[destination.id], card]
  foundations[destination.id] = newFoundation
  return {...state, foundations}
}

const getCardFromStock = (state) => {
  console.log('get card from stock')
  const topStock = state.stock[state.stock.length - 1]
  const stock = state.stock.splice(0, state.stock.length - 1)
  const talon = [...state.talon, topStock]
  return {...state, stock, talon }
}


const cards = (state = {}, action) => {
  console.log('enter reducer card with action ', action.type)
  //action.type
  //action.src
  //action.dst
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
