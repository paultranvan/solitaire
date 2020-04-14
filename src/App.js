import React from 'react'
import './App.css'
import Header from './components/Header'
import Stock from './components/Stock'
import Talon from './components/Talon'
import Foundation from './components/Foundation'
import Column from './components/Column'
import { Grid, Container } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { DndProvider } from 'react-dnd'
import Backend from 'react-dnd-html5-backend'

const renderStock = stock => {
  console.log('from stock : ', stock)
  return (
    <Grid.Column floated="left" width="2">
      <Stock cards={stock} />
    </Grid.Column>
  )
}

const renderTalon = talon => {
  return (
    <Grid.Column floated="left" width="2">
      <Talon cards={talon} />
    </Grid.Column>
  )
}

const renderFoundation = foundations => {
  return foundations.map((f, i) => {
    return (
      <Grid.Column key={i} floated="right" width="2">
        <Foundation id={i} cards={foundations[i]} />
      </Grid.Column>
    )
  })
}

const renderColumns = columns => {
  return columns.map((c, i) => {
    return (
      <Grid.Column key={i} floated="left" width="2">
        <Column id={i} cards={columns[i]} />
      </Grid.Column>
    )
  })
}

const App = ({ cards }) => {
  console.log('store with cards : ', cards)
  return (
    <div className="App">
      <DndProvider backend={Backend}>
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
      </DndProvider>
    </div>
  )
}

const mapStateToProps = state => {
  const cards = state
  console.log('call map state')
  return cards
}

export default connect(mapStateToProps)(App)
