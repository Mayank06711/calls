import { LOGOUT_REQUEST, LOGOUT_SUCCESS, LOGOUT_FAILURE } from '../action_creators';
import { makeRequest } from '../../utils/apiHandlers';
import { ENDPOINTS, HTTP_METHODS } from '../../constants/apiEndpoints';
import { showNotification } from './notification.actions';

export const logoutRequest = () => ({
  type: LOGOUT_REQUEST
});

export const logoutSuccess = () => ({
  type: LOGOUT_SUCCESS
});

export const logoutFailure = (error) => ({
  type: LOGOUT_FAILURE,
  payload: error
});

export const logout = () => async (dispatch) => {
  try {
    dispatch(logoutRequest());
    
    const response = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.USERS.LOGOUT
    );

    if (response.error) {
      throw response.error;
    }

    // Clear local storage
    localStorage.clear();
    
    dispatch(logoutSuccess());
    dispatch(showNotification('Logged out successfully', 200));
    
    // Redirect to login page (you can handle this in the component)
    window.location.href = '/login';
  } catch (error) {
    dispatch(logoutFailure(error));
    dispatch(showNotification(error.message || 'Logout failed', error.statusCode || 500));
  }
};