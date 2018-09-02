import React, { Component } from "react";
import PropTypes from "prop-types";

class Talon extends Component {
  render() {
    const { renderTopCard, cards } = this.props;
    return <div>{renderTopCard(cards)}</div>;
  }
}

Talon.propTypes = {
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired
};

export default Talon;
