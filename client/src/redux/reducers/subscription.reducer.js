import { SET_SUBSCRIPTION_TYPE } from "../action_creators/subscription.action_creators";

const initialState = {
  type: "CASUAL", // default subscription type
};

export const subscriptionReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SUBSCRIPTION_TYPE:
      return {
        ...state,
        type: action.payload,
      };
    default:
      return state;
  }
};
