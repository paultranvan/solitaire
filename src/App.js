import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Deck from './components/Deck.jsx';

class App extends Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Solitaire</h1>
        </header>
        <p className="App-intro">
          Soon... An amazing unique disruptive experience
        </p>
        <Deck></Deck>
      </div>
    );
  }
}

export default App;
