import { colors, values } from "./consts";

export function initGame() {
  const cards = {};

  let deck = Array.from({ length: 52 }, (v, i) => {
    const value = values[i % 13];
    const color = colors[Math.floor(i / 13)];
    return { i, value, color };
  });
  deck = shuffle(deck);

  let columns = [];

  for (let i = 0; i < 7; i++) {
    let columnCards = [];
    for (let j = 0; j < i + 1; j++) {
      columnCards.push(pickRandomCard(deck));
    }
    columns.push(columnCards);
    cards["column" + i] = columnCards;
  }

  for (let i = 0; i < 4; i++) {
    cards["foundation" + i] = [];
  }

  cards["stock"] = deck;
  cards["talon"] = [];

  return cards;
}

function shuffle(c) {
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

// Pick a random card from a deck and remove it
function pickRandomCard(cards) {
  const i = Math.floor(Math.random() * cards.length);
  const card = cards[i];
  cards.splice(i, 1);
  return card;
}
