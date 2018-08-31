import React, { Component } from "react";
import PropTypes from "prop-types";

class Card extends Component {
  constructor(props) {
    super(props);
    this.state = {
      path: "./assets/cards/",
      status: ""
    };
  }

  render() {
    const { value, color, onClick } = this.props;
    const file = this.state.path + color + "_" + value + ".png";

    return (
      <div>
        {onClick !== undefined ? (
          <img src={file} alt="" onClick={onClick} />
        ) : (
          <img src={file} alt="" />
        )}
      </div>
    );
  }
}

Card.propTypes = {
  id: PropTypes.number,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  onClick: PropTypes.func
};

export default Card;
