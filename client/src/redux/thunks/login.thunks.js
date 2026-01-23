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
  showSessionLimit,
} from "../actions/auth.actions";
// import { ensureSocketAuthenticated } from "../../socket/authentication";
import { fetchUserInfoThunk } from "./userInfo.thunks";
import { initializeSettingsThunk } from "./settings.thunk";

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
      if (error.statusCode === 403 && data?.data?.activeSessions) {
        dispatch(showSessionLimit({
          activeSessions: data.data.activeSessions,
          currentSubscription: data.data.subscriptionType,
          maxAllowed: data.data.maxAllowed, // changed from maxSessions to match controller
          partialToken: data.data.partialToken,
          otp: verificationData.otp,
          mobNum: verificationData.mobNum,
          subscriptionType: data.data.subscriptionType,
          verificationData: verificationData 
        }));
        // Don't mark as failure yet, let user decide
         dispatch(otpVerificationFailure(false)); 
         // Optional: Hide notification if modal is shown
         // dispatch(showNotification(error.message, error.statusCode));
        return;
      }

      dispatch(otpVerificationFailure(true));
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }
    if (data.success) {
      const { userId, isAlreadyVerified, token, fullName } = data.data;
      dispatch(initializeSettingsThunk());
      dispatch(otpVerificationSuccess(true));
      dispatch(setUserId(userId));
      dispatch(setAlreadyVerified(isAlreadyVerified));
      if(isAlreadyVerified){
        dispatch(fetchUserInfoThunk());
      }

      localStorage.setItem("userId", userId);
      localStorage.setItem("token", token);
      localStorage.setItem("isAlreadyVerified", isAlreadyVerified);
      localStorage.setItem("fullName", fullName);

      console.log("[verifyOtpThunk] Set userId, token, isAlreadyVerified, fullName:", userId, token, isAlreadyVerified, fullName);

      dispatch(
        showNotification(
          data.message || "OTP verified successfully!",
          statusCode
        )
      );

      // Socket connection/authentication is now handled by SocketContext
      // No direct socket logic here

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
      localStorage.removeItem("isEmailVerified"); 
      localStorage.removeItem("isTourCompleted");
      // add more

      console.log("[logoutThunk] Cleared userId, token, and related keys from localStorage");

      // Clear Redux state
      dispatch({ type: 'LOGOUT_SUCCESS' });
      dispatch(clearUserId());
      dispatch(showNotification("Logged out successfully", statusCode));

      // Redirect to login page
      window.location.href = '/login';
      // Socket disconnect is now handled by SocketContext
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
