import { colors, values } from "./consts";
import Card from "./card";

export default class Deck {
  constructor() {
    this.cards = Array.from({ length: 52 }, (v, i) => {
      const value = values[i % 13];
      const color = colors[Math.floor(i / 13)];
      return new Card(i, value, color);
    });
    this.shuffle();
  }

  shuffle() {
    let c = this.cards;
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
  }

  pickRandomCard() {
    const i = Math.floor(Math.random() * this.cards.length);
    const card = this.cards[i];
    this.cards.splice(i, 1);
    return card;
  }
}
