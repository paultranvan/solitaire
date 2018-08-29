import React, { Component } from "react";
import "./App.css";
import Header from "./components/Header";
import Deck from "./components/Deck";

class App extends Component {
  render() {
    return (
      <div className="App">
        <Header />
        <p className="App-intro">
          Soon... An amazing unique disruptive experience
        </p>
        <Deck />
      </div>
    );
  }
}

export default App;
