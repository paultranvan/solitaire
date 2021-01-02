import { Types } from '../lib/consts'


// TODO move these export functions elsewhere ?
export const isLastContainerCard = (state, card) => {
  const sourceType = card.container.type
  const container = [...state[sourceType]]
  if (card.container.hasOwnProperty('id')) {
    return container[card.container.id].length - 1 === card.container.position
  }
  return container.length - 1 === card.container.position
}


export const getColumnChildCards = (state, card) => {
  const column = state.columns[card.container.id]
  const position = card.container.position
  return column.slice(position)
}

export const isSingleCardDrop = (state, card) => {
  const sourceType = card.container.type
  if (sourceType !== Types.COLUMNS) {
      return true
  }
  const cards = getColumnChildCards(state, card)
  return cards.length < 2
}