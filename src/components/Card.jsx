import React from "react"
import { Image, Segment } from "semantic-ui-react"

const Card = ({id, value, color, onClick, visible = true}) => {

  const cardPath = visible
    ? "./assets/cards/" + color + "_" + value + ".png"
    : "./assets/cards/card_back.png"

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

export default Card
