import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { initDeck } from './game/init'
import './index.css'
import App from './App'
import game from './redux/reducers'
import 'semantic-ui-css/semantic.min.css'

const cards = { cards: initDeck() }
// Init the store with the cards
const store = createStore(
  game,
  cards,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
