// Auth Actions

import {
  OTP_GENERATION_SUCCESS,
  OTP_GENERATION_FAILURE,
  OTP_VERIFICATION_START,
  OTP_VERIFICATION_SUCCESS,
  OTP_VERIFICATION_FAILURE,
  RESET_OTP_STATES,
  SET_USER_ID,
  CLEAR_USER_ID,
  DECREMENT_TIMER,
  RESET_TIMER,
  SET_TIMER_ACTIVE,
  SET_USER_INFO,
  SET_ALREADY_VERIFIED,
  SET_PROFILE_DATA_LOADING
} from "../action_creators/login.action_creaters";

export const setUserId = (userId) => ({
  type: SET_USER_ID,
  payload: userId,
});

export const clearUserId = (payload) => ({
  type: CLEAR_USER_ID,
  payload: payload,
});

export const decrementTimer = (payload) => ({
  type: DECREMENT_TIMER,
  payload: payload,
});

export const resetTimer = (payload) => ({
  type: RESET_TIMER,
  payload: payload,
});

export const setTimerActive = (isActive) => ({
  type: SET_TIMER_ACTIVE,
  payload: isActive,
});

export const setUserInfo = (userInfo) => ({
  type: SET_USER_INFO,
  payload: userInfo,
});

export const setAlreadyVerified = (isVerified) => ({
  type: SET_ALREADY_VERIFIED,
  payload: isVerified,
});


export const otpGenerationSuccess = (payload) => ({
  type: OTP_GENERATION_SUCCESS,
  payload: payload,
});

export const otpGenerationFailure = (payload) => ({
  type: OTP_GENERATION_FAILURE,
  payload: payload,
});

export const otpVerificationStart = (payload) => ({
  type: OTP_VERIFICATION_START,
  payload: payload,
});

export const otpVerificationSuccess = (payload) => ({
  type: OTP_VERIFICATION_SUCCESS,
  payload: payload,
});

export const otpVerificationFailure = (payload) => ({
  type: OTP_VERIFICATION_FAILURE,
  payload: payload,
});

export const resetOtpStates = (payload) => ({
  type: RESET_OTP_STATES,
  payload: payload,
});

export const setProfileDataLoading = (isLoading) => ({
  type: SET_PROFILE_DATA_LOADING,
  payload: isLoading,
});
