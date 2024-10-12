import { SET_TOKEN, CLEAR_TOKEN, USER_LOGIN, USER_SIGNUP } from '../action_creators';

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