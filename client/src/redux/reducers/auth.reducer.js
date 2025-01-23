import {
  SET_USER_ID,
  CLEAR_USER_ID,
  DECREMENT_TIMER,
  RESET_TIMER,
  SET_TIMER_ACTIVE,
} from "../actions/auth.actions";

const initialState = {
  userId: null,
  userInfo: null,
  isAlreadyVerified: true,
  otpTimer: 60,
  isTimerActive: false,
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_ID:
      return {
        ...state,
        userId: action.payload,
      };
    case CLEAR_USER_ID:
      return {
        ...state,
        userId: null,
      };
    case DECREMENT_TIMER:
      return {
        ...state,
        otpTimer: state.otpTimer > 0 ? state.otpTimer - 1 : 0,
      };
    case RESET_TIMER:
      return {
        ...state,
        otpTimer: 60,
      };
    case SET_TIMER_ACTIVE:
      return {
        ...state,
        isTimerActive: action.payload,
      };
    case "SET_USER_INFO":
      return {
        ...state,
        userInfo: action.payload,
      };
    case "SET_ALREADY_VERIFIED":
      return {
        ...state,
        isAlreadyVerified: action.payload,
      };
    default:
      return state;
  }
};

export { authReducer };
