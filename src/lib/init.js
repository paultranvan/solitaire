import { Colors, Values } from './consts'

export const initDeck = () => {
  const cards = {}
  const deck = Array.from({ length: 52 }, (_, i) => {
    const value = Values[i % 13]
    const color = Object.values(Colors)[Math.floor(i / 13)]
    return { id: i, value, color }
  })
  const shuffledDeck = shuffle(deck)

  const columns = []
  for (let i = 0; i < 7; i++) {
    const columnCards = []
    for (let j = 0; j < i + 1; j++) {
      const card = pickRandomCard(shuffledDeck)
      columnCards.push(card)
    }
    columns.push(columnCards)
  }
  cards['columns'] = columns
  cards['foundations'] = [[], [], [], []]
  cards['stock'] = shuffledDeck
  cards['talon'] = []

  return cards
}

// Shuffle the cards of the deck
const shuffle = (deck) => {
  // if deck is direclty used, it is modified BEFORE calling shuffle. Why ?!
  const c = [...deck]
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = c[i]
    c[i] = c[j]
    c[j] = tmp
  }
  return c
}

// Pick a random card from a deck and remove it
const pickRandomCard = (cards) => {
  const i = Math.floor(Math.random() * cards.length)
  const card = cards[i]
  cards.splice(i, 1)
  return card
}
