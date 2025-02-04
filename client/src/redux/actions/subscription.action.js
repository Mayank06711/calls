import { SET_SUBSCRIPTION_TYPE } from '../action_creators/subscription.action_creators';

export const setSubscriptionType = (subscriptionType) => ({
  type: SET_SUBSCRIPTION_TYPE,
  payload: subscriptionType,
});