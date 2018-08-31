import React, { Component } from "react";
import Card from "./Card";
import PropTypes from "prop-types";

class Talon extends Component {
  renderCards = () => {
    const { cards } = this.props;

    if (cards.length > 0) {
      const topCard = cards[cards.length - 1];
      return (
        <Card id={topCard.id} value={topCard.value} color={topCard.color} />
      );
    }
    return;
  };

  render() {
    return <div>{this.renderCards()}</div>;
  }
}

Talon.propTypes = {
  cards: PropTypes.array.isRequired
};

export default Talon;
