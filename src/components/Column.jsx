import React, { useEffect } from "react"
import { connect } from 'react-redux'
import { moveCard, revealLastColumnCard } from '../actions/actions'
import Card from "./Card"
import { Types } from "../lib/consts"
import { Segment } from "semantic-ui-react"

const mapDispatchToProps = dispatch => {
  return {
    makeLastCardVisible: (id) => {
      dispatch(revealLastColumnCard(id))
    }
  }
}

const renderCard = (id, card, position, className) => {
  return (
    <div
      key={card.id}
      className={position === 0 ? "Column-card first" : "Column-card"}
    >
      <Card
        value={card.value}
        color={card.color}
        visible={!!card.visible}
        container={{type: Types.COLUMNS, id, position}}
      />
    </div>
  )
}

const renderColumn = (id, cards) => {
  return cards.map((card, i) => {
    return renderCard(id, card, i)
  })
}

    if (i === 0) {
      return renderCard(id, card, i, "Column-card first", visible)
    } else if (i === cards.length - 1) {
      return renderCard(id, card, i, "Column-card", visible)
    } else {
      return renderCard(id, card, i, "Column-card", visible)
    }
  })

  return (
      <Segment.Group>
        <div
          ref={drop}
        >
          {renderColumn(id, cards)}
        </div>
      </Segment.Group>
  )
}

export default connect(null, mapDispatchToProps)(Column)
