import React, { Component } from "react";
import PropTypes from "prop-types";

class Foundation extends Component {
  render() {
    const { renderTopCard, cards } = this.props;
    return <div>{renderTopCard(cards)}</div>;
  }
}

Foundation.propTypes = {
  cards: PropTypes.array.isRequired,
  renderTopCard: PropTypes.func.isRequired
};

export default Foundation;
