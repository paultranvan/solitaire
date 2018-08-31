import React, { Component } from "react";
import Card from "./Card";
import PropTypes from "prop-types";

class Stock extends Component {
  renderCards = () => {
    const { cards, onClick } = this.props;

    if (cards.length > 0) {
      const topCard = cards[cards.length - 1];
      return (
        <Card
          id={topCard.id}
          value={topCard.value}
          color={topCard.color}
          onClick={() => onClick(topCard.id)}
        />
      );
    }
    return;
  };

  render() {
    return <div>{this.renderCards()}</div>;
  }
}

Stock.propTypes = {
  cards: PropTypes.array.isRequired,
  onClick: PropTypes.func.isRequired
};

export default Stock;
