import React from 'react'
import './App.css'
import ActionsButtons from './components/ActionButtons'
import Header from './components/Header'
import Stock from './components/Stock'
import Talon from './components/Talon'
import Foundation from './components/Foundation'
import Column from './components/Column'
import Win from './components/Win'
import { Grid, Container } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'
import { DndProvider } from 'react-dnd'

const isTouchDevice =
  navigator.maxTouchPoints > 0 || 'ontouchstart' in document.documentElement
const backend = isTouchDevice ? TouchBackend : HTML5Backend
console.log('is touch device : ', isTouchDevice)

const App = ({ cards, game }) => {
  const renderStock = () => {
    return (
      <Grid.Column floated="left" width="2">
        <Stock stock={cards.stock} />
      </Grid.Column>
    )
  }

  const renderTalon = () => {
    return (
      <Grid.Column floated="left" width="2">
        <Talon talon={cards.talon} />
      </Grid.Column>
    )
  }

  const renderFoundation = () => {
    return cards.foundations.map((f, i) => {
      return (
        <Grid.Column key={i} floated="right" width="2">
          <Foundation id={i} foundation={cards.foundations[i]} game={game} />
        </Grid.Column>
      )
    })
  }

  const renderColumns = () => {
    return cards.columns.map((c, i) => {
      return (
        <Grid.Column key={i} mobile={2} tablet={2} computer={2}>
          <Column id={i} column={cards.columns[i]} game={game} />
        </Grid.Column>
      )
    })
  }

  return (
    <div className="App">
      <Win gameWon={game.gameWon} />
      <Header />
      <DndProvider backend={backend}>
        <Container>
          <Grid columns="equal">
            {/* columns=equal means columns have the same width */}
            <Grid.Row centered>
              <ActionsButtons game={game} />
            </Grid.Row>
            <Grid.Row>
              {renderStock()}
              {renderTalon()}

              <Grid.Column width="4" />
              {renderFoundation()}
            </Grid.Row>

            <Grid.Row>{renderColumns()}</Grid.Row>
          </Grid>
        </Container>
      </DndProvider>
    </div>
  )
}

const mapStateToProps = (state) => {
  //console.log('state : ', state)
  const { cards, game } = state
  return { cards: cards.present, game }
}

export default connect(mapStateToProps)(App)
