import * as actionTypes from '../actions';

const initialState = {
  room: {}
};

const reducer = (state = initialState, action) => {
  switch(action.type) {
    case actionTypes.UPDATE_ROOM:
      return {
        room: {...action.room}
      };
    default:
      return state;
  }
};

export default reducer;