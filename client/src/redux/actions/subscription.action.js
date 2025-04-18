import { SET_SUBSCRIPTION_TYPE,GET_SUBSCRIPTION_PLANS } from '../action_creators/subscription.action_creators';

export const setSubscriptionType = (subscriptionType) => ({
  type: SET_SUBSCRIPTION_TYPE,
  payload: subscriptionType,
});

export const getSubscriptionPlans = (payload) => ({
  type: GET_SUBSCRIPTION_PLANS,
  payload: payload,
});