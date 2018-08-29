import React, { Component } from 'react';
import Card from './Card'

class Deck extends Component {

  constructor(props) {
      super(props)

      const colors = ['heart', 'diamond', 'spade', 'club']
      const values = Array.from({length: 13}, (v, i) => (i+1).toString() )

      this.state = {
        colors: colors,
        values: values
      }
  }

  createDeck = () => {
    const cards = Array.from({length: 52}, (v, i) => {
      let value = this.state.values[i % 13]
      let color = this.state.colors[Math.floor(i / 13)]
      let c = <Card
            key={i}
            value={value}
            color={color}
          />
      return c
    })
    return cards
  }

  render() {

    return (
      <div>
        {this.createDeck()}
      </div>

    )
  }
}

export default Deck;
