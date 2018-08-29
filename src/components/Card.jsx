import React, { Component } from 'react';

class Card extends Component {

  render() {
    const {value, color} = this.props
    const cards_path = './assets/cards/'
    const file =  cards_path + color + '_' + value + '.png'

    console.log(file)
    return (
      <img src={file} alt="Card" />
    )
  }
}

export default Card;
