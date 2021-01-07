import React from 'react'
import { connect } from 'react-redux'

import { cheatMode } from '../redux/actions/actions'

const mapDispatchToProps = (dispatch) => {
  return {
    cheatMode: (id, card) => {
      dispatch(cheatMode(card))
    }
  }
}

const ActionButtons = ({ game, cheatMode }) => {
  return (
    <div>
      <button className="ui red huge circular icon button">
        <i className="home icon"></i>
      </button>
      <button className="ui red huge circular icon button">
        <i className="reply icon"></i>
      </button>
      <button className="ui red huge circular icon button">
        <i className="chart bar outline icon"></i>
      </button>
      <button className="ui red huge circular icon button" onClick={cheatMode}>
        <i className="cog icon"></i>
      </button>
      {/*
      <i className="big circular reply icon"></i>
      <i className="big circular chart bar outline icon"></i>
      <i className="big circular cog icon"></i>
      */}
    </div>
  )
}

export default connect(null, mapDispatchToProps)(ActionButtons)
