// src/redux/reducers/authReducer.js
import { SET_TOKEN, CLEAR_TOKEN } from '../action_creators';

const initialState = {
  token: null // Check if a token already exists in localStorage
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_TOKEN:
      return { ...state, token: action.payload };
    case CLEAR_TOKEN:
      return { ...state, token: null };
    default:
      return state;
  }
};

export default authReducer;
