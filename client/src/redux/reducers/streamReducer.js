import { ADD_STREAM, LOGOUT_ACTION } from '../action_creators';

const streamsReducer = (state = {}, action) => {
  switch (action.type) {
    case ADD_STREAM:
      return {
        ...state,
        [action.payload.who]: action.payload
      };
    case LOGOUT_ACTION:
      return {};
    default:
      return state;
  }
};

export  {streamsReducer};