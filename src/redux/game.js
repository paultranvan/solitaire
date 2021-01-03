import { getColorType, isKing } from '../lib/consts'

const isSameColorType = (sourceCard, targetCard) => {
  return getColorType(sourceCard.color) === getColorType(targetCard.color)
}

const isPreviousValue = (sourceCard, targetCard) => {
    return sourceCard.value === targetCard.value - 1
}

const canPlayCardInColumn = (sourceCard, targetCard) => {
  return (!isSameColorType(sourceCard, targetCard) && isPreviousValue(sourceCard, targetCard))
}

export const canDropHere = (state, sourceCard, containerTarget) => {
  const targetCards = [...state[containerTarget.type][containerTarget.id]]
  if (targetCards.length < 1) {
    // Column empty, check if the source card is a king
    return isKing(sourceCard.value)
  } else {
    // Check if source card is allowed to be played on target
    const lastTargetCard = targetCards[targetCards.length - 1]
    const canPlay = canPlayCardInColumn(sourceCard, lastTargetCard)
    return canPlay
  }

}