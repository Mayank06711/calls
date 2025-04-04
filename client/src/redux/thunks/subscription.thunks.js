import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { SUBSCRIPTION_TYPES } from "../../utils/getSubscriptionColors";
import { LOADER_TYPES } from "../action_creators";
import {
  getSubscriptionPlans,
  showNotification,
  startLoader,
  stopLoader,
} from "../actions";

export const createSubscriptionThunk =
  (subscriptionData) => async (dispatch) => {
    const createSubscription = LOADER_TYPES.SUBSCRIPTION_CREATE;

    try {
      dispatch(startLoader(createSubscription));
      const validTypes = ["GOLD", "SILVER", "PLATINUM"];
      if (!validTypes.includes(subscriptionData.type)) {
        dispatch(showNotification("Invalid subscription type", 400));
        return;
      }

      const requestBody = {
        type: subscriptionData.type,
        ...(subscriptionData.referralCode && {
          referralCode: subscriptionData.referralCode,
        }),
      };

      const { data, error, statusCode } = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.SUBSCRIPTIONS.CREATE,
        requestBody
      );

      if (error) {
        dispatch(showNotification(error.message, error.statusCode));
        dispatch(stopLoader(createSubscription));
        return;
      }

      if (data.success) {
        const subscriptionInfo = data.data;

        // Show success message based on subscription type
        const successMessage = `Successfully subscribed to ${subscriptionData.type} plan!`;
        dispatch(showNotification(successMessage, statusCode));

        // Update subscription state
        dispatch(stopLoader(createSubscription));
        return subscriptionInfo; // Return subscription data for further processing if needed
      } else {
        dispatch(
          showNotification("Subscription creation failed", statusCode || 500)
        );
        dispatch(stopLoader(createSubscription));
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      dispatch(
        showNotification(error.message || "Failed to create subscription", 400)
      );
      dispatch(stopLoader(createSubscription));
    }
  };

  export const getSubscriptionPlansThunk = () => async (dispatch) => {
    const loaderType = LOADER_TYPES.SUBSCRIPTION_GET_PLANS;
  
    try {
      dispatch(startLoader(loaderType));
  
      const { data, error, statusCode } = await makeRequest(
        HTTP_METHODS.GET,
        ENDPOINTS.SUBCRIPTIONS.PLANS_SUBSCRIPTION
      );
  
      if (error) {
        dispatch(showNotification(error.message, error.statusCode));
        return;
      }
  
      if (data.success) {
        const plans = data.data;
        console.log("Transformed plans------------->:", plans);
        dispatch(getSubscriptionPlans(plans));
      } else {
        dispatch(showNotification("Failed to fetch subscription plans", statusCode || 500));
      }
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      dispatch(showNotification(error.message || "Failed to fetch subscription plans", 400));
    } finally {
      dispatch(stopLoader(loaderType));
    }
  };