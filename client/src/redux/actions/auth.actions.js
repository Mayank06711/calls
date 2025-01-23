// Auth Actions
export const SET_USER_ID = "SET_USER_ID";
export const CLEAR_USER_ID = "CLEAR_USER_ID";
export const DECREMENT_TIMER = "DECREMENT_TIMER";
export const RESET_TIMER = "RESET_TIMER";
export const SET_TIMER_ACTIVE = "SET_TIMER_ACTIVE";
export const SET_USER_INFO = "SET_USER_INFO";
export const SET_ALREADY_VERIFIED = "SET_ALREADY_VERIFIED";

export const setUserId = (userId) => ({
  type: SET_USER_ID,
  payload: userId,
});

export const clearUserId = () => ({
  type: CLEAR_USER_ID,
});

export const decrementTimer = () => ({
  type: DECREMENT_TIMER,
});

export const resetTimer = () => ({
  type: RESET_TIMER,
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

// ... other actions ...
