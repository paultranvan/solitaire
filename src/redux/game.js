import { getColorType, Types, Values } from '../lib/consts'

const isSameColor = (sourceCard, targetCard) => {
  return sourceCard.color === targetCard.color
}

const isSameColorType = (sourceCard, targetCard) => {
  return getColorType(sourceCard.color) === getColorType(targetCard.color)
}

const isPreviousValue = (sourceCard, targetCard) => {
    return sourceCard.value === targetCard.value - 1
}

const isNextValue = (sourceCard, targetCard) => {
  return sourceCard.value === targetCard.value + 1
}

const isKing = (value) => {
  return Math.max(...Values) === value
}

const isAce = (value) => {
  return Math.min(...Values) === value
}

const canPlayOnColumnCard = (sourceCard, targetCard) => {
  return (!isSameColorType(sourceCard, targetCard) && isPreviousValue(sourceCard, targetCard))
}

const canPlayOnFoundationCard = (sourceCard, targetCard) => {
  return (isSameColor(sourceCard, targetCard) && isNextValue(sourceCard, targetCard))
}

export const canPlayInColumn = (state, sourceCard, containerTarget) => {
  const targetCards = [...state[Types.COLUMNS][containerTarget.id]]
  if (targetCards.length < 1) {
    // Column empty, check if the source card is a king
    return isKing(sourceCard.value)
  } else {
    // Check if source card is allowed to be played on target
    const lastTargetCard = targetCards[targetCards.length - 1]
    return canPlayOnColumnCard(sourceCard, lastTargetCard)
  }
}

export const canPlayInFoundation = (state, sourceCard, containerTarget) => {
  const targetCards = [...state[Types.FOUNDATIONS][containerTarget.id]]
  if (targetCards.length < 1) {
    // Foundation empty, check if the source card is an ace
    return isAce(sourceCard.value)
  } else {
    // Check if source card is allowed to be played on target
    const lastTargetCard = targetCards[targetCards.length - 1]
    const canPlay = canPlayOnFoundationCard(sourceCard, lastTargetCard)
    console.log('can play : ', canPlay)
    return canPlay
  }
}