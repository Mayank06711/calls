import { SHOW_NOTIFICATION, HIDE_NOTIFICATION } from '../action_creators';

export const showNotification = (message, statusCode) => ({
  type: SHOW_NOTIFICATION,
  payload: {
    message,
    statusCode,
    visible: true,
  },
});

export const hideNotification = () => ({
  type: HIDE_NOTIFICATION,
});