import {
  GET_FROM_STOCK,
  MOVE_CARD,
  REFILL_STOCK,
  REVEAL_LAST_COLUMN_CARD,
  CHEAT_MODE,
  CHECK_GAME_WON
} from './types'

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

export const revealLastColumnCard = (columnId) => {
  return {
    type: REVEAL_LAST_COLUMN_CARD,
    columnId
  }
}

export const cheatMode = () => {
  return {
    type: CHEAT_MODE
  }
}

export const checkGameWon = (columns) => {
  return {
    type: CHECK_GAME_WON,
    columns
  }
}
