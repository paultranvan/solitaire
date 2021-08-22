import React from 'react'
import { connect } from 'react-redux'
import { ActionCreators } from 'redux-undo'
import { Segment, Button, Icon } from 'semantic-ui-react'
import { cheatMode } from '../redux/actions/actions'

const mapDispatchToProps = (dispatch) => {
  return {
    cheatMode: (id, card) => {
      dispatch(cheatMode(card))
    },
    undo: () => {
      dispatch(ActionCreators.undo())
    }
  }
}

const ActionButtons = ({ game, cheatMode, undo }) => {
  return (
    <Segment>
      <Button className="ui red huge circular icon Button">
        <Icon name="home"></Icon>
      </Button>
      <Button className="ui red huge circular icon Button" onClick={undo}>
        <Icon name="reply"></Icon>
      </Button>
      <Button className="ui red huge circular icon Button">
        <Icon name="chart bar outline"></Icon>
      </Button>
      <Button className="ui red huge circular icon Button" onClick={cheatMode}>
        <Icon name="cog"></Icon>
      </Button>
      {/*
      <Icon className="big circular reply icon"></Icon>
      <Icon className="big circular chart bar outline icon"></Icon>
      <Icon className="big circular cog icon"></Icon>
      */}
    </Segment>
  )
}

export default connect(null, mapDispatchToProps)(ActionButtons)
