import { USER_LOGIN } from "../actions";
import { USER_SINGUP } from "../actions";

const userLogin = (payload) => {
  console.log(payload);
  return {
    type: USER_LOGIN,
    payload,
  };
};

const userSignup = (payload) => {
  console.log(payload);
  return {
    type: USER_SINGUP,
    payload,
  };
};

export { userLogin, userSignup };
