import { GET_FROM_STOCK, MOVE_CARD, REFILL_STOCK } from './types'

export const getFromStock = () => {
  return {
    type: GET_FROM_STOCK
  }
}

export const refillStock = () => {
  return {
    type: REFILL_STOCK
  }
}

export const moveCard = (card, destination) => {
  return {
    type: MOVE_CARD,
    card,
    destination
  }
}
