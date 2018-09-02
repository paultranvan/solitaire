import React, { Component } from "react";
import PropTypes from "prop-types";
import Card from "./Card";
import { Segment } from "semantic-ui-react";

class Column extends Component {
  renderColumn = () => {
    const { cards } = this.props;

    return cards.map(card => {
      return <Card id={card.id} value={card.value} color={card.color} />;
    });
  };

  render() {
    return <Segment.Group>{this.renderColumn()}</Segment.Group>;
  }
}

Column.propTypes = {
  cards: PropTypes.array.isRequired
};

export default Column;
