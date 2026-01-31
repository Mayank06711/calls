const initState = {
  current: "idle", // idle, negotiating, progress, complete
  video: "off", // video feed status: "off" "enabled" "disabled" "complete"
  audio: "off", // audio feed status: "off" "enabled" "disabled" "complete"
  audioDevice: "default",
  videoDevice: "default",
  shareScreen: false,
  haveMedia: false,
  haveCreatedOffer: false,
  // Video call fields
  callId: null,
  remoteUserId: null,
  isCaller: false,
  callStartTime: null,
};

const callStatusReducer = (state = initState, action) => {
  if (action.type === "UPDATE_CALL_STATUS") {
    const copyState = { ...state };
    copyState[action.payload.prop] = action.payload.value;
    return copyState;
  } else if (action.type === "RESET_CALL_STATUS") {
    return { ...initState };
  } else if (action.type === "LOGOUT_ACTION" || action.type === "NEW_VERSION") {
    return { ...initState };
  } else {
    return state;
  }
};

export { callStatusReducer };
