import { getColorType, Types, Values } from './consts'

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
  return (
    !isSameColorType(sourceCard, targetCard) &&
    isPreviousValue(sourceCard, targetCard)
  )
}

const canPlayOnFoundationCard = (sourceCard, targetCard) => {
  return (
    isSameColor(sourceCard, targetCard) && isNextValue(sourceCard, targetCard)
  )
}

export const canPlayInColumn = (cards, game, sourceCard, containerTarget) => {
  if (game.cheat) {
    return true
  }
  const targetCards = [...cards[Types.COLUMNS][containerTarget.id]]
  if (targetCards.length < 1) {
    // Column empty, check if the source card is a king
    return isKing(sourceCard.value)
  } else {
    // Check if source card is allowed to be played on target
    const lastTargetCard = targetCards[targetCards.length - 1]
    return canPlayOnColumnCard(sourceCard, lastTargetCard)
  }
}

export const canPlayInFoundation = (
  cards,
  game,
  sourceCard,
  containerTarget
) => {
  if (game.cheat) {
    return true
  }
  const targetCards = [...cards[Types.FOUNDATIONS][containerTarget.id]]
  if (targetCards.length < 1) {
    // Foundation empty, check if the source card is an ace
    return isAce(sourceCard.value)
  } else {
    // Check if source card is allowed to be played on target
    const lastTargetCard = targetCards[targetCards.length - 1]
    return canPlayOnFoundationCard(sourceCard, lastTargetCard)
  }
}

// Auto-move first checks the foundations, then the columns
export const findAutoMoveTarget = (cards, game, sourceCard) => {
  const foundations = [...cards[Types.FOUNDATIONS]]
  for (let i = 0; i < foundations.length; i++) {
    if (canPlayInFoundation(cards, game, sourceCard, { id: i })) {
      return { type: Types.FOUNDATIONS, id: i }
    }
  }
  const columns = [...cards[Types.COLUMNS]]
  for (let i = 0; i < columns.length; i++) {
    if (canPlayInColumn(cards, game, sourceCard, { id: i })) {
      return { type: Types.COLUMNS, id: i }
    }
  }
  // No auto-move found
  return null
}

export const isGameWon = (columns) => {
  for (const column of columns) {
    const hasNotVisible = column.find((card) => !card.visible)
    if (hasNotVisible) {
      //console.log('has not : ', hasNotVisible)
      return false
    }
  }
  console.log('WON')
  return true
}
