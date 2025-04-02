import { makeRequest } from "../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../constants/apiEndpoints";
import {
  fetchUserInfoStart,
  fetchUserInfoSuccess,
  fetchUserInfoFailure,
  setUserInfo,
} from "../actions/userInfo.actions";
import { showNotification } from "../actions/notification.actions";
import { setAlreadyVerified, setProfileDataLoading } from "../actions/auth.actions";

export const fetchUserInfoThunk = () => async (dispatch) => {
  try {
    dispatch(fetchUserInfoStart());
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.USERS.PROFILE
    );
    if (error) {
      dispatch(fetchUserInfoFailure(error.message));
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }
    if (data.success) {
      const userInfo = data.data;
      console.log("userinfoooooooor1111111111111",userInfo);
      dispatch(showNotification(`Welcome ${userInfo.fullName}`, statusCode));
      localStorage.setItem("fullName",userInfo.fullName );
      localStorage.setItem("isEmailVerified", userInfo.isEmailVerified);
      dispatch(fetchUserInfoSuccess(userInfo));
      dispatch(setUserInfo(userInfo));
      dispatch(setProfileDataLoading(false));
    } else {
      dispatch(
        showNotification("Profile cannot be fetched", statusCode || 500)
      );
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
    dispatch(fetchUserInfoFailure(error.message));
    dispatch(setProfileDataLoading(false));
    dispatch(
      showNotification(error.message || "Failed to fetch user info", 400)
    );
  }
};

export const updateUserInfoThunk = (userData) => async (dispatch) => {
  try {
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.PATCH,
      ENDPOINTS.USERS.UPDATE,
      userData
    );

    if (error) {
      console.log("error in update user thunk", error);
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }
    if (data.success) {
      
      dispatch(setAlreadyVerified(true));
      dispatch(
        showNotification(
          "Congrats your Profile updated successfully!",
          statusCode
        )
      );

      dispatch(showNotification("You can update your profile photo Anytime"));
      dispatch(fetchUserInfoThunk());
    } else {
      dispatch(
        showNotification("Profile cannot be updated", statusCode || 500)
      );
    }
    return data;
  } catch (error) {
    console.error("Error updating user info:", error);
    dispatch(
      showNotification(error.message || "Failed to update profile", 400)
    );
    // We In front and we don't throw errors it is for back end which gracefully handle the errors by showing multiple kind of notifications or pages or something like that
    return;
  }
};
