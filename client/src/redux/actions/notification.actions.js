import { SHOW_NOTIFICATION, HIDE_NOTIFICATION } from '../action_creators';

export const showNotification = (message, statusCode, metadata = null) => ({
  type: SHOW_NOTIFICATION,
  payload: {
    message,
    statusCode,
    visible: true,
    metadata, // Can include { userId, chatId, type: 'chat_message' }
  },
});

export const hideNotification = () => ({
  type: HIDE_NOTIFICATION,
});