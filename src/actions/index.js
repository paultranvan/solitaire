export const moveCard = (source, destType) => {
  return {type: "MOVE_CARD", source, destType}
}
