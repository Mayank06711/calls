import { IS_OPEN_FEEDBACK } from "../action_creators";

const isOpenFeedbackInitialState = false;

export const isOpenFeedbackReducer = (state = isOpenFeedbackInitialState, action) => {
  switch (action.type) {
    case IS_OPEN_FEEDBACK:
      return action.payload;
    default:
      return state;
  }
};