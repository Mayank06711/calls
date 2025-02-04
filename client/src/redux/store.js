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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(thunk),
  devTools: env.NODE_ENV !== "production",
});

export default store;
