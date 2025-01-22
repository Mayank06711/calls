import { makeRequest } from "../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../constants/apiEndpoints";
import {
  fetchUserInfoStart,
  fetchUserInfoSuccess,
  fetchUserInfoFailure,
} from "../actions/userInfo.actions";
import { showNotification } from "../actions/notification.actions";

export const fetchUserInfoThunk = () => async (dispatch) => {
  try {
    dispatch(fetchUserInfoStart());
    console.log("fetching user info");
    const response = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.USERS.PROFILE
    );
    console.log("response in fetchUserInfoThunk", response);
    if (response.parsedBody?.success) {
      // response.parsedBody is already parsed, use it directly
      const userInfo = response.parsedBody.data;
      console.log("userInfo in fetchUserInfoThunk", userInfo);
      dispatch(fetchUserInfoSuccess(userInfo));
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
    dispatch(fetchUserInfoFailure(error.message));
    dispatch(
      showNotification(
        error.message || "Failed to fetch user info",
        error.status || 400
      )
    );
  }
};
