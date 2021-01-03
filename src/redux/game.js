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

// Auto-move first checks the foundations, then the columns
export const findAutoMoveTarget = (state, sourceCard) => {
  const foundations = [...state[Types.FOUNDATIONS]]
  for (let i = 0; i < foundations.length; i++) {
    if (canPlayInFoundation(state, sourceCard, {id: i})) {
      return {type: Types.FOUNDATIONS, id: i}
    }
  }
  const columns = [...state[Types.COLUMNS]]
  for (let i = 0; i < columns.length; i++) {
    if (canPlayInColumn(state, sourceCard, {id: i})) {
      return {type: Types.COLUMNS, id: i}
    }
  }
  // No auto-move found 
  return null
}