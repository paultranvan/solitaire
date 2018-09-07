import React, { Component } from "react";
import PropTypes from "prop-types";
import Card from "./Card";
import { Draggable, Droppable } from "react-beautiful-dnd";
import { Segment, Image } from "semantic-ui-react";

class Talon extends Component {
  renderCard = cards => {
    if (cards.length > 0) {
      const card = cards[cards.length - 1];
      return <Card value={card.value} color={card.color} visible={true} />;
    }
    return (
      <Segment>
        <Image src="./assets/cards/b1fv.png" alt="" size="tiny" />
      </Segment>
    );
  };

  render() {
    const { renderTopCard, cards } = this.props;

    return (
      <Droppable droppableId={"talon"} type="to_drop">
        {(provided, snapshot) => (
          <div ref={provided.innerRef}>
            <Draggable draggableId={"talon"} index={0} type="to_drop">
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

Talon.propTypes = {
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired
};

export default Talon;
