import React, { Component } from "react";
import "./App.css";
import Header from "./components/Header";
import Card from "./components/Card";
import Stock from "./components/Stock";
import Talon from "./components/Talon";
import Foundation from "./components/Foundation";
import Column from "./components/Column";
import Deck from "./lib/deck";
import { Grid, Segment, Container, Image } from "semantic-ui-react";
import { DragDropContext } from "react-dnd";
import HTML5Backend from "react-dnd-html5-backend";

class App extends Component {
  constructor(props) {
    super(props);

    let deck = new Deck();
    let columns = [];

    for (let i = 0; i < 7; i++) {
      let columnCards = [];
      for (let j = 0; j < i + 1; j++) {
        columnCards.push(deck.pickRandomCard());
      }
      columns.push(columnCards);
    }

    let foundations = Array.from({ length: 4 }, (x, i) => []);

    this.state = {
      stock: deck.cards,
      columns: columns,
      talon: [],
      foundations: foundations
    };

    console.log("stock : ", JSON.stringify(this.state.stock));
    console.log("piles : ", JSON.stringify(this.state.piles));
  }

  popStockCard = id => {
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
    const { stock } = this.state;
    return (
      <Grid.Column floated="left" width="2">
        <Stock
          cards={stock}
          onClick={this.popStockCard}
          renderTopCard={this.renderTopCard}
        />
      </Grid.Column>
    );
  };

  renderTalon = () => {
    const { talon } = this.state;

    return (
      <Grid.Column floated="left" width="2">
        <Talon cards={talon} renderTopCard={this.renderTopCard} />
      </Grid.Column>
    );
  };

  renderFoundation = () => {
    const { foundations } = this.state;

    return foundations.map((f, i) => {
      return (
        <Grid.Column key={i} floated="right" width="2">
          <Foundation
            cards={foundations[i]}
            renderTopCard={this.renderTopCard}
          />
        </Grid.Column>
      );
    });
  };

  renderColumns = () => {
    const { columns } = this.state;
    console.log("columns : ", JSON.stringify(columns));
    return columns.map((c, i) => {
      return (
        <Grid.Column key={i} floated="left" width="2">
          <Column cards={columns[i]} />
        </Grid.Column>
      );
    });
  };

  renderTopCard = (cards, onClick) => {
    if (cards.length > 0) {
      const topCard = cards[cards.length - 1];
      return (
        <div>
          <Card
            id={topCard.id}
            value={topCard.value}
            color={topCard.color}
            onClick={() => onClick(topCard.id)}
          />
        </div>
      );
    }
    return (
      <div>
        <Segment>
          <Image src="./assets/cards/b1fv.png" alt="" size="tiny" />
        </Segment>
      </div>
    );
  };

  render() {
    return (
      <div className="App">
        <Header />
        <Container>
          <Grid columns="equal">
            <Grid.Row>
              {this.renderStock()}
              {this.renderTalon()}
              <Grid.Column width="4" />
              {this.renderFoundation()}
            </Grid.Row>
            <Grid.Row>{this.renderColumns()}</Grid.Row>
          </Grid>
        </Container>
      </div>
    );
  }
}

export default DragDropContext(HTML5Backend)(App);
