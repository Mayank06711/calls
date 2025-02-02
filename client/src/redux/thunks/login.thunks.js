import {
  generateOtp,
  // setToken,
  showNotification,
  setUserId,
  clearUserId,
  setAlreadyVerified,
  otpVerificationStart,
  otpGenerationFailure,
  otpGenerationSuccess,
} from "../actions";
import { makeRequest } from "../../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
// import { authenticate } from "../../socket/authentication";
import {
  otpVerificationFailure,
  otpVerificationSuccess,
  resetTimer,
  setTimerActive,
} from "../actions/auth.actions";
import { authenticateSocket } from "../../socket/authentication";

export const generateOtpThunk = (mobileNumber) => async (dispatch) => {
  try {
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.AUTH.GENERATE_OTP,
      {
        mobNum: mobileNumber,
        isTesting: true,
      }
    );
    if (error) {
      dispatch(otpGenerationFailure());
      dispatch(showNotification(error.message, error.statusCode));
      return null;
    }

    if (data.success) {
      dispatch(generateOtp(data));
      dispatch(otpGenerationSuccess(true));
      dispatch(resetTimer());
      dispatch(setTimerActive(true));
      dispatch(
        showNotification(data.message || "OTP sent successfully!", statusCode)
      );
    } else {
      dispatch(otpGenerationFailure());
      dispatch(
        showNotification(
          "Failed to send OTP, please try again",
          statusCode || 400
        )
      );
      return null;
    }

    return data;
  } catch (error) {
    // Handle network or other unexpected errors
    dispatch(otpGenerationFailure());
    dispatch(
      showNotification(
        "Unable to connect to server. Please check your internet connection.",
        500
      )
    );
    console.error("Error generating OTP:", error);
    return null;
  }
};

export const verifyOtpThunk = (verificationData) => async (dispatch) => {
  try {
    dispatch(otpVerificationStart());
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.AUTH.VERIFY_OTP,
      verificationData
    );
    if (error) {
      dispatch(otpVerificationFailure(true));
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }
    if (data.success) {
      const { userId, isAlreadyVerified, token } = data.data;
      dispatch(otpVerificationSuccess(true));
      dispatch(setUserId(userId));
      dispatch(setAlreadyVerified(isAlreadyVerified));

      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);
      localStorage.setItem("isAlreadyVerified", isAlreadyVerified);

      // Authenticate socket connection
      try {
        await authenticateSocket(token);
      } catch (socketError) {
        console.error("Socket authentication failed:", socketError);
        // Optionally show a notification but don't fail the login
      }

      dispatch(
        showNotification(
          data.message || "OTP verified successfully!",
          statusCode
        )
      );
    } else {
      dispatch(otpVerificationFailure(true));
      dispatch(showNotification("Invalid OTP", statusCode || 400));
    }
    return data;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    dispatch(otpVerificationFailure(true));
    dispatch(showNotification(error.message || "Failed to verify OTP", 400));
  }
};


export const logoutThunk = () => async (dispatch) => {
  dispatch({ type: 'LOGOUT_REQUEST' });
  try {
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.USERS.LOGOUT
    );
 
    if (error) {
      dispatch({ type: 'LOGOUT_FAILURE', payload: error.message });
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }
    if (data.success) {
      // Clear local storage
      localStorage.removeItem("userId");
      localStorage.removeItem("mobNum");
      localStorage.removeItem("token");
      localStorage.removeItem("isAlreadyVerified");

      // Clear Redux state
      dispatch({ type: 'LOGOUT_SUCCESS' });
      dispatch(clearUserId());
      dispatch(showNotification("Logged out successfully", statusCode));

      // Redirect to login page
      window.location.href = '/login';
    } else {
      dispatch({ type: 'LOGOUT_FAILURE', payload: 'Logout failed' });
      dispatch(showNotification("Logout failed", statusCode || 400));
    }
  } catch (error) {
    console.error("Error during logout:", error);
    dispatch({ type: 'LOGOUT_FAILURE', payload: error.message });
    dispatch(showNotification(
      "Unable to connect to server. Please check your internet connection.",
      500
    ));
  }
};
