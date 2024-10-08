import { combineReducers } from "redux";
import callStatusReducer from "./callStatusReducer"
import streamsReducer from "./streamReducer";

const rootReducer = combineReducers({
  callStatus: callStatusReducer,
  streams: streamsReducer,
});

export default rootReducer;
