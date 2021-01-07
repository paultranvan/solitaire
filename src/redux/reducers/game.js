import { CHEAT_MODE, CHECK_GAME_WON } from '../actions/types'
import { isGameWon } from '../../game/game'

const cheatMode = (state) => {
  console.log('cheat mode enabled!')
  const newCheatMode = !state.cheat
  return { ...state, cheat: newCheatMode }
}

const checkGameWon = (state, columns) => {
  return { ...state, gameWon: isGameWon(columns) }
}

const game = (state = {}, action) => {
  //console.log('enter reducer card with action ', action.type)
  switch (action.type) {
    case CHEAT_MODE:
      return cheatMode(state)
    case CHECK_GAME_WON:
      return checkGameWon(state, action.columns)
    default:
      return state
  }
}

export default game
