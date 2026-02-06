import { configureStore } from "@reduxjs/toolkit";
import env from "../config/env.config";
import {
  authReducer,
  callStatusReducer,
  streamsReducer,
  notificationReducer,
  userInfoReducer,
  socketMetricsReducer,
  subscriptionReducer,
  loaderReducer,
  subscriptionPlansReducer,
  settingsReducer,
  isOpenFeedbackReducer,
  sessionReducer,
  wardrobeReducer,
} from "./reducers";
import { thunk } from "redux-thunk";

const store = configureStore({
  reducer: {
    auth: authReducer,
    callStatus: callStatusReducer,
    streams: streamsReducer,
    notification: notificationReducer,
    userInfo: userInfoReducer,
    socketMetrics: socketMetricsReducer,
    subscription: subscriptionReducer, 
    loaderState: loaderReducer,
    plans:subscriptionPlansReducer,
    settings:settingsReducer,
    isOpenFeedback:isOpenFeedbackReducer,
    sessions: sessionReducer,
    wardrobe: wardrobeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(thunk),
  devTools: env.NODE_ENV !== "production",
});

export default store;
