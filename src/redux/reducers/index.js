import { combineReducers } from 'redux'
import undoable from 'redux-undo'
import cardsReducer from './cards'
import gameReducer from './game'

const rootReducer = combineReducers({
  cards: undoable(cardsReducer, {
    limit: false
  }),
  game: gameReducer
})

export default rootReducer
