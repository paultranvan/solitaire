import React from "react"
import { Image, Segment } from "semantic-ui-react"
import { useDrag } from 'react-dnd'
import { Types } from "../lib/consts"

const Card = ({value, color, container, onClick, visible = true}) => {
  const [{ isDragging }, drag] = useDrag({
    item: { type: Types.CARD, value, color, container },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: (monitor) => {
      // Hidden card cannot be dragged
      return visible
    }
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
