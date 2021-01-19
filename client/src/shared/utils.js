export const applyDrag = (arr, dragResult) => {
  const { removedIndex, addedIndex, payload } = dragResult;
  if (removedIndex === null && addedIndex === null) return arr;

  const result = [...arr];
  let itemToAdd = payload;

  if (removedIndex !== null) {
    itemToAdd = result.splice(removedIndex, 1)[0];
  }

  if (addedIndex !== null) {
    result.splice(addedIndex, 0, itemToAdd);
  }

  return result;
};

export const getUserString = (user, index, currentTurn, myUsername) => {
  return user.name + 
    // (user.name === myUsername ? ' (Me)' : '') + 
    (user.isHost ? ' (Host)' : '') +
    (currentTurn === index ? ' (Speaking)' : '') +
    (currentTurn === 'ended' ? ' - ' + user.card : '') +
    (user.isOut ? ' (Out)' : '') +
    (currentTurn === 'ended' && user.role === 'anti' ? ' (Undercover)' : '');
};

export const getMinMaxAntiBlank = (totalCount) => {
  return {
    minAnti: 1,
    maxAnti: parseInt(totalCount/3, 10),
    minBlank: 0,
    maxBlank: totalCount < 4 ? 0 : 1
  };
};