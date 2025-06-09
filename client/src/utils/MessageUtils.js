// src/utils/messageUtils.js

export const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file',
    AUDIO: 'audio',
    VIDEO: 'video'
  };
  
  export const MESSAGE_STATUS = {
    SENDING: 'sending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    SEEN: 'seen',
    FAILED: 'failed'
  };
  
  export const formatMessage = (message) => {
    return {
      id: message.id,
      type: message.type || MESSAGE_TYPES.TEXT,
      content: message.content,
      senderId: message.senderId,
      receiverId: message.receiverId,
      timestamp: message.timestamp || Date.now(),
      status: message.status || MESSAGE_STATUS.SENDING,
      metadata: message.metadata || {}
    };
  };
  
  export const isImageFile = (file) => {
    return file.type.startsWith('image/');
  };
  
  export const getFileType = (file) => {
    if (file.type.startsWith('image/')) return MESSAGE_TYPES.IMAGE;
    if (file.type.startsWith('video/')) return MESSAGE_TYPES.VIDEO;
    if (file.type.startsWith('audio/')) return MESSAGE_TYPES.AUDIO;
    return MESSAGE_TYPES.FILE;
  };