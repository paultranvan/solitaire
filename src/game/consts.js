export const Values = Array.from({ length: 13 }, (v, i) => i + 1)

export const Colors = {
  HEART: 'heart',
  DIAMOND: 'diamond',
  SPADE: 'spade',
  CLUB: 'club'
}

export const ColorsType = {
  BLACK: 'black',
  RED: 'red'
}

export const getColorType = (color) => {
  if (color === Colors.HEART || color === Colors.DIAMOND) {
    return ColorsType.RED
  }
  if (color === Colors.SPADE || color === Colors.CLUB) {
    return ColorsType.BLACK
  }
}

export const Types = {
  STOCK: 'stock',
  TALON: 'talon',
  FOUNDATIONS: 'foundations',
  COLUMNS: 'columns',
  CARD: 'card'
}
