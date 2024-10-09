import { combineReducers } from "redux";
import callStatusReducer from "./callStatusReducer"
import streamsReducer from "./streamReducer";
import authReducer from "./auth.reducers";

const rootReducer = combineReducers({
  callStatus: callStatusReducer,
  streams: streamsReducer,
  auth: authReducer
});

export default rootReducer;
