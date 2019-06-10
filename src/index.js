import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { createStore } from "redux"
import { initDeck } from "./lib/init"
import "./index.css"
import App from "./App"
import game from "./reducers"
import "semantic-ui-css/semantic.min.css"
import registerServiceWorker from "./registerServiceWorker"

const cards = {cards: initDeck()}
// Init the store with the cards
const store = createStore(game, cards)

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
)
registerServiceWorker()
