import React, { Component } from "react";

class Header extends Component {
  render() {
    const logo = "./assets/logo.svg";

    return (
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1 className="App-title">Solitaire</h1>
      </header>
    );
  }
}

export default Header;