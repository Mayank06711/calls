import axios from "axios";
import { userLogin } from "../action_creators";
import { userSignup } from "../action_creators"; // Assuming you have a signup action creator

const userLoginThunk = (payload) => async (dispatch) => {
  try {
    const response = await axios.post(
      "https://localhost:5005/api/v1/users/login",
      {
        email: payload.email,
        password: payload.password,
      },{
        withCredentials: true,
      }
    );
    console.log(response.data)
    dispatch(userLogin(response.data)); // Dispatch the userLogin action with the response data
  } catch (error) {
    console.log(
      "Error in the user login thunk:",
      error.response?.data || error.message
    );
  }
};

const userSignupThunk = (payload) => async (dispatch) => {
  try {
    const response = await axios.post(
      "https://localhost:5005/api/v1/users/signup", // Signup API endpoint
      {
        username: payload.username, // Include username for signup
        email: payload.email,
        password: payload.password,
      }
    );
    console.log(response.data)
    dispatch(userSignup(response.data)); // Dispatch the userSignup action with the response data
  } catch (error) {
    console.log(
      "Error in the user signup thunk:",
      error.response?.data || error.message
    );
  }
};

export { userLoginThunk, userSignupThunk };
