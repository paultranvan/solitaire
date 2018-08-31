import React, { Component } from "react";
import "./App.css";
import Header from "./components/Header";
import Stock from "./components/Stock";
import Talon from "./components/Talon";
//import Card from "./components/Card";
import Deck from "./lib/deck";
import Stack from "./lib/stack";

class App extends Component {
  constructor(props) {
    super(props);
    //let card1 = <Card value="10" color="spade" />;
    //  let card2 = <Card value="10" color="heart" />;

    let deck = new Deck();
    let piles = [];

    for (let i = 0; i < 7; i++) {
      let pileCards = [];
      for (let j = 7 - i; j > 0; j--) {
        pileCards.push(deck.pickRandomCard());
      }
      let pile = new Stack(pileCards);
      piles.push(pile);
    }

    this.state = {
      stock: deck.cards,
      piles: piles,
      talon: [],
      foundations: []
    };

    console.log("stock : ", JSON.stringify(this.state.stock));
    console.log("piles : ", JSON.stringify(this.state.piles));
  }

  popCard = id => {
    const lastCard = this.state.stock[this.state.stock.length - 1];
    // Remove card from stock
    this.setState(prevState => ({
      stock: prevState.stock.filter(stock => stock !== lastCard)
    }));
    // Add card to talon
    this.setState(prevState => ({
      talon: [...prevState.talon, lastCard]
    }));
  };

  renderStock = () => {
    return this.state.stock.cards.map(card => card);
  };

  render() {
    const { stock, talon } = this.state;

    return (
      <div className="App">
        <Header />
        <p className="App-intro">
          Soon... An amazing unique disruptive experience
        </p>
        <div>
          <Stock cards={stock} onClick={this.popCard} />
          <Talon cards={talon} />
        </div>
      </div>
    );
  }
}

export default App;
