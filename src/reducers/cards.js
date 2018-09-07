function moveCard(state, src, dstType) {
  // Remove card from source
  // TODO not only top card
  const pile = state[src.type];
  pile.splice(pile.length - 1, 1);

  // Add card to target
  // TODO remove type?
  state[dstType].push(src);

  return state;
}

const cards = (state = {}, action) => {
  //action.type
  //action.src
  //action.dst
  switch (action.type) {
    case "MOVE_CARD":
      state = moveCard(state, action.source, action.destinationType);
      return state;

    default:
      return state;
  }
};

export default cards;
