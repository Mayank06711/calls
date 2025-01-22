import {
  SET_USER_INFO,
  FETCH_USER_INFO_START,
  FETCH_USER_INFO_SUCCESS,
  FETCH_USER_INFO_FAILURE,
} from "../action_creators/userInfo.creators";

const initialState = {
  data: null,
  loading: false,
  error: null,
};

export const userInfoReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER_INFO:
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
      };
    case FETCH_USER_INFO_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case FETCH_USER_INFO_SUCCESS:
      return {
        ...state,
        data: action.payload,
        loading: false,
        error: null,
      };
    case FETCH_USER_INFO_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};
