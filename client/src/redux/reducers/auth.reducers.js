// src/redux/reducers/authReducer.js
import { SET_TOKEN, CLEAR_TOKEN,DECREMENT_TIMER,RESET_TIMER, SET_TIMER_ACTIVE } from '../action_creators';

const initialState = {
  token: null,
  otpTimer: 10,
  isTimerActive: false
};


const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_TOKEN:
      return { ...state, token: action.payload };
    case CLEAR_TOKEN:
      return { ...state, token: null };
    case DECREMENT_TIMER:
      return { 
        ...state, 
        otpTimer: state.otpTimer > 0 ? state.otpTimer - 1 : 0 
      };
    case RESET_TIMER:
      return { 
        ...state, 
        otpTimer: action.payload 
      };
    case SET_TIMER_ACTIVE:
      return { 
        ...state, 
        isTimerActive: action.payload 
      };
    default:
      return state;
  }
};

export { authReducer};
