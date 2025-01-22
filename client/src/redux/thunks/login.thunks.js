import {
  generateOtp,
  setToken,
  showNotification,
  userLogin,
  userSignup,
  setUserId,
  clearUserId,
  setAlreadyVerified,
} from "../actions";
import socketConnection from "../../webRTCUtils/socketConnection";
import { makeRequest } from "../../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { ApiError } from "../../utils/globalErrorHandler";
import { setUserInfo } from "../actions/userInfo.actions";

export const userLoginThunk = (payload) => async (dispatch) => {
  try {
    const response = await axios.post(
      "https://localhost:5005/api/v1/users/login",
      {
        email: payload.email,
        password: payload.password,
      },
      {
        withCredentials: true,
      }
    );
    console.log(response.data);

    // Store token in Redux store and localStorage
    const token = response.data.localToken;
    if (token) {
      localStorage.setItem("token", token);
      dispatch(setToken(token));
    }
    dispatch(userLogin(response.data)); // Dispatch userLogin action
    socketConnection(response.data.token);
  } catch (error) {
    console.log(
      "Error in the user login thunk:",
      error.response?.data || error.message
    );
  }
};

export const userSignupThunk = (payload) => async (dispatch) => {
  try {
    const response = await axios.post(
      "https://localhost:5005/api/v1/users/signup",
      {
        username: payload.username,
        email: payload.email,
        password: payload.password,
      }
    );
    console.log(response.data);

    const token = response.data.localToken;
    if (token) {
      localStorage.setItem("token", token);
      dispatch(setToken(token));
    }
    dispatch(userSignup(response.data));
    socketConnection(response.data.token);
  } catch (error) {
    console.log(
      "Error in the user signup thunk:",
      error.response?.data || error.message
    );
  }
};

export const generateOtpThunk = (mobileNumber) => async (dispatch) => {
  try {
    const response = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.AUTH.GENERATE_OTP,
      {
        mobNum: mobileNumber,
        isTesting: true,
      }
    );
    const { parsedBody } = response;

    console.log("OTP Generation Response:", {
      parsedBody,
      smsId: parsedBody?.data?.sms_id,
      referenceId: parsedBody?.data?.reference_id,
    });

    dispatch(generateOtp(parsedBody));
    return parsedBody;
  } catch (error) {
    console.error(
      "Error generating OTP:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const verifyOtpThunk = (verificationData) => async (dispatch) => {
  try {
    const response = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.AUTH.VERIFY_OTP,
      verificationData
    );
    if (response?.parsedBody?.success) {
      const { userId, isAlreadyVerified } = response.parsedBody.data;
      dispatch(setUserId(userId));
      dispatch(setAlreadyVerified(isAlreadyVerified));
      localStorage.setItem("userId", userId);
      dispatch(
        showNotification(
          response.parsedBody.message || "OTP verified successfully!",
          200
        )
      );
    }
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    dispatch(
      showNotification(
        error.response?.data?.message || "Failed to verify OTP",
        error.response?.status || 400
      )
    );
    throw {
      message: error.response?.data?.message || "Failed to verify OTP", 
      status: error.response?.status || 400,
      error
    };
  }
};

export const updateUserInfoThunk = (userData) => async (dispatch) => {
  try {
    const response = await makeRequest(
      HTTP_METHODS.PATCH,
      ENDPOINTS.USERS.UPDATE,
      userData 
    );

    if (response?.parsedBody?.success) {
      const userInfo = response.parsedBody.data;
      dispatch(setUserInfo(userInfo));
      dispatch(setAlreadyVerified(true));
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
      dispatch(showNotification("Profile updated successfully!", 200));
    }
    return response;
  } catch (error) {
    console.error("Error updating user info:", error);
    dispatch(
      showNotification(
        error.message || "Failed to update profile",
        error.status || 400
      )
    );
    // We In front and we don't throw errors it is for back end which gracefully handle the errors by showing multiple kind of notifications or pages or something like that
    throw error;
  }
};

export const logoutThunk = () => async (dispatch) => {
  try {
    // Clear local storage
    localStorage.removeItem("userId");
    localStorage.removeItem("mobNum");

    // Clear Redux state
    dispatch(clearUserId());

    dispatch(showNotification("Logged out successfully", 200));
  } catch (error) {
    console.error("Error during logout:", error);
    dispatch(showNotification("Error during logout", 400));
  }
};
