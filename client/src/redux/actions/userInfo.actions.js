import {
  SET_USER_INFO,
  FETCH_USER_INFO_START,
  FETCH_USER_INFO_SUCCESS,
  FETCH_USER_INFO_FAILURE,
} from "../action_creators/userInfo.creators";

export const setUserInfo = (userInfo) => ({
  type: SET_USER_INFO,
  payload: userInfo,
});

export const fetchUserInfoStart = () => ({
  type: FETCH_USER_INFO_START,
});

export const fetchUserInfoSuccess = (userInfo) => ({
  type: FETCH_USER_INFO_SUCCESS,
  payload: userInfo,
});

export const fetchUserInfoFailure = (error) => ({
  type: FETCH_USER_INFO_FAILURE,
  payload: error,
});
