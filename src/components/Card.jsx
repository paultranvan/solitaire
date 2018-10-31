import React, { Component } from "react"
import PropTypes from "prop-types"
import { Image, Segment } from "semantic-ui-react"

class Card extends Component {
  constructor(props) {
    super(props)
    this.state = {
      cardsPath: "./assets/cards/"
    }
  }

  render() {
    const { value, color, onClick, visible } = this.props

    const cardPath = visible
      ? this.state.cardsPath + color + "_" + value + ".png"
      : this.state.cardsPath + "card_back.png"

    return (
      <Segment>
        {onClick !== undefined ? (
          <Image src={cardPath} alt="" onClick={onClick} size="tiny" />
        ) : (
          <Image src={cardPath} alt="" size="tiny" />
        )}
      </Segment>
    )
  }
}

Card.propTypes = {
  id: PropTypes.number,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  onClick: PropTypes.func
}

Card.defaultProps = {
  visible: true
}

export default Card
