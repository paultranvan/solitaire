import React, { Component } from "react"
import "./App.css"
import Header from "./components/Header"
import Card from "./components/Card"
import Stock from "./components/Stock"
import Talon from "./components/Talon"
import Foundation from "./components/Foundation"
import Column from "./components/Column"
import { Grid, Segment, Container, Image } from "semantic-ui-react"
import { DragDropContext } from "react-dnd"
import HTML5Backend from "react-dnd-html5-backend"
import { connect } from 'react-redux'

// https://react-redux.js.org/introduction/basic-tutorial
// https://codesandbox.io/s/9on71rvnyo


const renderStock = (stock) => {
  console.log('from stock : ', stock)
  return (
    <Grid.Column floated="left" width="2">
      <Stock
        stock={stock}
      />
    </Grid.Column>
  )
}

const renderTalon = (talon) => {
  return (
    <Grid.Column floated="left" width="2">
      <Talon cards={talon} renderTopCard={renderTopCard} />
    </Grid.Column>
  )
}

const renderFoundation = (foundations) => {
  console.log('from foundation : ', foundations)
  return foundations.map((f, i) => {
    return (
      <Grid.Column key={i} floated="right" width="2">
        <Foundation
          id={i}
          cards={foundations[i]}
          renderTopCard={renderTopCard}
        />
      </Grid.Column>
    )
  })
}

const renderColumns = (columns) => {
  return columns.map((c, i) => {

    return (
      <Grid.Column key={i} floated="left" width="2">
        <Column cards={columns[i]} />
      </Grid.Column>
    )
  })
}

const renderTopCard = (cards, onClick) => {
  if (cards.length > 0) {
    const topCard = cards[cards.length - 1]

    return (
      <div>
        <Card
          id={topCard.id}
          value={topCard.value}
          color={topCard.color}
          onClick={() => onClick(topCard.id)}
        />
      </div>
    )
  }
  return (
    <div>
      <Segment>
        <Image src="./assets/cards/b1fv.png" alt="" size="tiny" />
      </Segment>
    </div>
  )
}

const App = ({cards}) => {
  console.log('app function with cards : ', cards)
  return (
    <div className="App">
      <Header />
      <Container>
        <Grid columns="equal">
          <Grid.Row>
            {renderStock(cards.stock)}
            {renderTalon(cards.talon)}
            <Grid.Column width="4" />
            {renderFoundation(cards.foundations)}
          </Grid.Row>
          <Grid.Row>{renderColumns(cards.columns)}</Grid.Row>
        </Grid>
      </Container>
    </div>
  )
}

const mapStateToProps = (state) => {
  const cards  = state
  console.log('call map state')
  return cards
}

//export default DragDropContext(HTML5Backend)(App)
export default connect(mapStateToProps)(App)
