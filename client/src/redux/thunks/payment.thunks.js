import { makeRequest } from "../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../constants/apiEndpoints";
import { showNotification } from "../actions/notification.actions";

/**
 * GET /payments/config
 * Returns { provider, keyId } — never exposes key_secret.
 * Called once before opening the checkout popup.
 */
export const getPaymentConfigThunk = () => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.PAYMENTS.CONFIG);
    if (error) {
      dispatch(showNotification(error.message || "Failed to load payment config", 500));
      return { success: false };
    }
    if (data?.success) {
      return { success: true, config: data.data };
    }
    return { success: false };
  } catch (err) {
    dispatch(showNotification("Failed to load payment config", 500));
    return { success: false };
  }
};

/**
 * POST /payments/create-order
 * Creates a Razorpay/Stripe order for a pending subscription.
 * Returns { providerOrderId, amount, currency, keyId, provider, paymentOrderId }
 * Client NEVER sends the price — server looks it up from the subscription.
 */
export const createPaymentOrderThunk = (subscriptionId) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.PAYMENTS.CREATE_ORDER,
      { subscriptionId }
    );
    if (error) {
      dispatch(showNotification(error.message || "Failed to create payment order", error.statusCode || 500));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      return { success: true, order: data.data };
    }
    dispatch(showNotification("Failed to create payment order", 500));
    return { success: false };
  } catch (err) {
    dispatch(showNotification(err.message || "Failed to create payment order", 500));
    return { success: false, error: err.message };
  }
};

/**
 * POST /payments/verify
 * Called after Razorpay checkout success callback.
 * Sends the three values returned by Razorpay to the backend for verification.
 * Backend verifies signature + cross-checks amount, then activates the subscription.
 */
export const verifyPaymentThunk =
  ({ providerOrderId, providerPaymentId, signature }) =>
  async (dispatch) => {
    try {
      const { data, error } = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.PAYMENTS.VERIFY,
        { providerOrderId, providerPaymentId, signature }
      );
      if (error) {
        dispatch(showNotification(error.message || "Payment verification failed", error.statusCode || 500));
        return { success: false, error: error.message };
      }
      if (data?.success) {
        dispatch(showNotification("Payment successful! Subscription activated.", 200));
        return { success: true, result: data.data };
      }
      dispatch(showNotification("Payment verification failed", 500));
      return { success: false };
    } catch (err) {
      dispatch(showNotification(err.message || "Payment verification failed", 500));
      return { success: false, error: err.message };
    }
  };

/**
 * GET /payments/order/:providerOrderId
 * Polling fallback — check order status without relying on verify response.
 * Useful if user closes the popup before the verify callback fires.
 */
export const getOrderStatusThunk = (providerOrderId) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.PAYMENTS.ORDER_STATUS}/${providerOrderId}`
    );
    if (error) return { success: false };
    if (data?.success) return { success: true, order: data.data };
    return { success: false };
  } catch {
    return { success: false };
  }
};

/**
 * GET /payments/history
 * Paginated list of the current user's payment orders.
 */
export const getPaymentHistoryThunk =
  ({ page = 1, limit = 10 } = {}) =>
  async (dispatch) => {
    try {
      const { data, error } = await makeRequest(
        HTTP_METHODS.GET,
        `${ENDPOINTS.PAYMENTS.HISTORY}?page=${page}&limit=${limit}`
      );
      if (error) {
        dispatch(showNotification(error.message || "Failed to load payment history", 500));
        return { success: false };
      }
      if (data?.success) return { success: true, ...data.data };
      return { success: false };
    } catch (err) {
      dispatch(showNotification("Failed to load payment history", 500));
      return { success: false };
    }
  };
