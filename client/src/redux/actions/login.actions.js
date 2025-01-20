import { SET_TOKEN, CLEAR_TOKEN, USER_LOGIN, USER_SIGNUP, GENERATE_OTP,DECREMENT_TIMER,RESET_TIMER,SET_TIMER_ACTIVE } from '../action_creators';

export const setToken = (token) => ({
  type: SET_TOKEN,
  payload: token,
});

export const clearToken = () => ({
  type: CLEAR_TOKEN,
});

export const userLogin = (data) => ({
  type: USER_LOGIN,
  payload: data,
});

export const userSignup = (data) => ({
  type: USER_SIGNUP,
  payload: data,
});


export const generateOtp = (data) => ({
  type: GENERATE_OTP,
  payload: data,
});

export const setTimerActive = (isActive) => ({
  type: SET_TIMER_ACTIVE,
  payload: isActive
});

export const decrementTimer = () => ({
  type: DECREMENT_TIMER
});

export const resetTimer = (time) => ({
  type: RESET_TIMER,
  payload: time
});