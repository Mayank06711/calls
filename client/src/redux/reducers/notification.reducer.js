import { SHOW_NOTIFICATION, HIDE_NOTIFICATION } from '../action_creators';

const initialState = {
  message: '',
  statusCode: null,
  visible: false,
};

export const notificationReducer = (state = initialState, action) => {
  switch (action.type) {
    case SHOW_NOTIFICATION:
      return {
        ...state,
        ...action.payload,
      };
    case HIDE_NOTIFICATION:
      return {
        ...state,
        visible: false,
      };
    default:
      return state;
  }
};