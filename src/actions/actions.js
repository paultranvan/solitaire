import { GET_FROM_STOCK, MOVE_CARD } from './types'

export const getFromStock = () => {
  return {
    type: GET_FROM_STOCK
  }
}

export const moveCard = (card, destination) => {
  return {
    type: MOVE_CARD,
    card,
    destination
  }
}
