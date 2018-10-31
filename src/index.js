import React from "react"
import ReactDOM from "react-dom"
import { Provider } from "react-redux"
import { createStore } from "redux"
import { initGame } from "./lib/init"
import "./index.css"
import App from "./App"
import rootReducer from "./reducers"
import "semantic-ui-css/semantic.min.css"
import registerServiceWorker from "./registerServiceWorker"

const cards = initGame()
console.log("cards init : ", JSON.stringify(cards))
const store = createStore(rootReducer, cards)

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
)
registerServiceWorker()
