import { SET_SUBSCRIPTION_TYPE,GET_SUBSCRIPTION_PLANS } from "../action_creators/subscription.action_creators";

const initialState = {
  type: "CASUAL", // default subscription type
};

const getSubscriptionPlansInitialState = {
  plans: null,
}

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

export const subscriptionPlansReducer = (state = getSubscriptionPlansInitialState, action) => {
  switch (action.type) {
    case GET_SUBSCRIPTION_PLANS:
      return {
        plans: action.payload,
      };
    default:
      return state;
  }
};
