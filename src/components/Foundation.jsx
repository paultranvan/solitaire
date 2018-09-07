import React, { Component } from "react";
import PropTypes from "prop-types";
import { Draggable, Droppable } from "react-beautiful-dnd";
import Card from "./Card";
import { Segment, Image } from "semantic-ui-react";

class Foundation extends Component {
  renderCard = cards => {
    if (cards.length > 0) {
      const card = cards[cards.length - 1];
      return (
        <Card
          id={card.id}
          value={card.value}
          color={card.color}
          visible={true}
        />
      );
    }
    return (
      <Segment>
        <Image src="./assets/cards/b1fv.png" alt="" size="tiny" />
      </Segment>
    );
  };

  render() {
    const { id, renderTopCard, cards } = this.props;

    //return <div>{renderTopCard(cards)}</div>;
    return (
      <Droppable droppableId={"foundation_" + id.toString()}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef}>
            <Draggable draggableId={"foundation_" + id.toString()} index={0}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  {this.renderCard(cards)}
                </div>
              )}
            </Draggable>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    );
  }
}

Foundation.propTypes = {
  id: PropTypes.number.isRequired,
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired
};

export default Foundation;
