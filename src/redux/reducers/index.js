import { combineReducers } from 'redux'
import cards from './cards'
import game from './game'

const rootReducer = combineReducers({
  cards,
  game
})

export default rootReducer
