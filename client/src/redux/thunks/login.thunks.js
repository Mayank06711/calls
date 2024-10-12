import axios from "axios";
import { setToken, userLogin, userSignup } from "../actions";
import socketConnection from "../../webRTCUtils/socketConnection";

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
