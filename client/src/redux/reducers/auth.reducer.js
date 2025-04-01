import {
  SET_USER_ID,
  CLEAR_USER_ID,
  DECREMENT_TIMER,
  RESET_TIMER,
  SET_TIMER_ACTIVE,
  SET_USER_INFO,
  SET_ALREADY_VERIFIED,
  OTP_GENERATION_SUCCESS,
  OTP_GENERATION_FAILURE,
  OTP_VERIFICATION_START,
  OTP_VERIFICATION_SUCCESS,
  OTP_VERIFICATION_FAILURE,
  RESET_OTP_STATES,
  LOGOUT_REQUEST,
  LOGOUT_SUCCESS,
  LOGOUT_FAILURE,
  SET_PROFILE_DATA_LOADING,
  SET_DARK_MODE,
} from "../action_creators/login.action_creaters";

const initialState = {
  userId: null,
  userInfo: null,
  isAlreadyVerified: false,
  timer: 60,
  isTimerActive: false,
  otpGenerated: false,
  otpVerified: false,
  otpVerificationInProgress: false,
  isLoggingOut: false,
  logoutError: null,
  isProfileDataLoading: false,
  isDarkMode:null,
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
        timer: state.timer > 0 ? state.timer - 1 : 0,
      };
    case RESET_TIMER:
      return {
        ...state,
        timer: 60,
      };
    case SET_TIMER_ACTIVE:
      return {
        ...state,
        isTimerActive: action.payload,
      };
    case SET_USER_INFO:
      return {
        ...state,
        userInfo: action.payload,
      };
    case SET_ALREADY_VERIFIED:
      return {
        ...state,
        isAlreadyVerified: action.payload,
      };
    case OTP_GENERATION_SUCCESS:
      return {
        ...state,
        otpGenerated: true,
      };
    case OTP_GENERATION_FAILURE:
      return {
        ...state,
        otpGenerated: false,
      };
    case OTP_VERIFICATION_START:
      return {
        ...state,
        otpVerificationInProgress: true,
      };
    case OTP_VERIFICATION_SUCCESS:
      return {
        ...state,
        otpVerified: action.payload,
        otpVerificationInProgress: false,
      };
    case OTP_VERIFICATION_FAILURE:
      return {
        ...state,
        otpVerified: false,
        otpVerificationInProgress: false,
      };
    case RESET_OTP_STATES:
      return {
        ...state,
        otpGenerated: false,
        otpVerified: false,
        otpVerificationInProgress: false,
      };
    case LOGOUT_REQUEST:
      return {
        ...state,
        isLoggingOut: true,
        logoutError: null,
      };

    case LOGOUT_SUCCESS:
      return {
        ...initialState,
      };

    case LOGOUT_FAILURE:
      return {
        ...state,
        isLoggingOut: false,
        logoutError: action.payload,
      };

    case SET_PROFILE_DATA_LOADING:
      return {
        ...state,
        isProfileDataLoading: action.payload,
      };

      case SET_DARK_MODE:
      return {
        ...state,
        isDarkMode: action.payload,
      };
    default:
      return state;
  }
};

export { authReducer };
