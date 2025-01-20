import { configureStore } from '@reduxjs/toolkit';
import { authReducer, callStatusReducer, streamsReducer, notificationReducer } from './reducers';
import {thunk} from 'redux-thunk';

const store = configureStore({
  reducer: {
    auth: authReducer,
    callStatus: callStatusReducer,
    streams: streamsReducer,
    notification: notificationReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(thunk),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;