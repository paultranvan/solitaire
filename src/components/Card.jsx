import React from "react"
import { Image, Segment } from "semantic-ui-react"
import { useDrag } from 'react-dnd'
import { Types } from "../lib/consts"

const Card = ({id, value, color, position, onClick, visible = true}) => {
  const [{ isDragging }, drag] = useDrag({
    item: { type: Types.CARD, value, color, position },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  const cardPath = visible
    ? "./assets/cards/" + color + "_" + value + ".png"
    : "./assets/cards/card_back.png"

  return (
    <div
      ref={drag}
      style={{
        cursor: 'move',
        opacity: isDragging ? 0 : 1,
      }}
    >
      <Segment>
        {onClick !== undefined ? (
          <Image src={cardPath} alt="" onClick={onClick} size="tiny" />
        ) : (
          <Image src={cardPath} alt="" size="tiny" />
        )}
      </Segment>
    </div>
  )
}

export default Card
