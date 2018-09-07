import React, { Component } from "react";
import PropTypes from "prop-types";
import Card from "./Card";
import { Segment } from "semantic-ui-react";
import { Draggable } from "react-beautiful-dnd";

class Column extends Component {
  isVisible(card) {
    const { cards } = this.props;
    return cards.indexOf(card) === cards.length - 1;
  }

  renderCard = (card, i, className, visible) => {
    const type = visible ? "to_drop" : "not_drop_" + card.id;
    console.log("type : " + type + " for " + JSON.stringify(card));

    return (
      <Draggable key={card.id} draggableId={card.id} index={i} type={type}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            style={{
              backgroundColor: snapshot.isDraggingOver ? "blue" : "grey"
            }}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
          >
            <div className={className}>
              <Card
                id={card.id}
                value={card.value}
                color={card.color}
                visible={visible}
              />
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  renderColumn = () => {
    const { cards } = this.props;

    if (cards.length === 1) {
      return this.renderCard(cards[0], 0, "Column-card first", true);
    }

    return cards.map((card, i) => {
      const visible = this.isVisible(card);

      if (i === 0) {
        return this.renderCard(card, i, "Column-card first", visible);
      } else if (i === cards.length - 1) {
        return this.renderCard(card, i, "Column-card", visible);
      } else {
        return this.renderCard(card, i, "Column-card", visible);
      }
    });
  };

  render() {
    return <Segment.Group>{this.renderColumn()}</Segment.Group>;
  }
}

Column.propTypes = {
  id: PropTypes.number.isRequired,
  cards: PropTypes.array.isRequired
};

export default Column;
