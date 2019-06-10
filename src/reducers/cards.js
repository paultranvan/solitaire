import { GET_FROM_STOCK } from '../actions/types'

function moveCard(state, src, dstType) {
  // Remove card from source
  // TODO not only top card
  const pile = state[src.type];
  pile.splice(pile.length - 1, 1);

  // Add card to target
  // TODO remove type?
  state[dstType].push(src);

  return state;
}

const getCardFromStock = (state) => {
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
    case "MOVE_CARD":
      state = moveCard(state, action.source, action.destinationType);
      return state
    case GET_FROM_STOCK:
      return getCardFromStock(state)
    case "INIT":
      return state
    default:
      return state
  }
};

export default cards
