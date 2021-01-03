import React from 'react'
import { Image, Segment } from 'semantic-ui-react'
import { connect } from 'react-redux'
import { useDrag } from 'react-dnd'
import { Types } from '../lib/consts'
import { isLastContainerCard } from '../redux/helpers'

const mapStateToProps = (state, ownProps) => {
  const { cards } = state
  const isLastCard = isLastContainerCard(cards, ownProps)
  return { isLastCard }
}

const Card = ({
  value,
  color,
  container,
  visible = true,
  onClick,
  children,
  canDrop,
  isLastCard
}) => {
  const [{ isDragging }, drag] = useDrag({
    item: { type: Types.CARD, value, color, container },
    collect: monitor => ({
      isDragging: !!monitor.isDragging()
    }),
    canDrag: () => {
      return visible
    }
  })
  
  const style = {
    backgroundColor: 'green'
  }
  
  const cardPath = visible
    ? './assets/cards/' + color + '_' + value + '.png'
    : './assets/cards/card_back.png'

  return (
    <div
      ref={drag}
      style={{
        cursor: 'move',
        opacity: isDragging ? 0.1 : 1,
        border: isDragging ? '3px dashed gray' : 'none'
      }}
    >
      <Segment style={canDrop && isLastCard ? style : null}>
          {onClick !== undefined ? (
            <Image src={cardPath} alt="" onClick={onClick} size="tiny" />
          ) : (
            <Image src={cardPath} alt="" size="tiny"  />
          )}
      </Segment>
  
      {children} 
    </div>
  )
}

export default connect(
  mapStateToProps,
  null
)(Card)
