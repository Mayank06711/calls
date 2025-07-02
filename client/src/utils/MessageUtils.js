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
    FAILED: 'failed',
    PENDING: 'pending'
  };
  
  export function formatMessage(msg) {
    return {
      id: msg.id || msg.messageId,
      content: msg.content || msg.text,
      senderId: msg.senderId || (msg.sender && msg.sender._id) || msg.sender,
      receiverId: msg.receiverId,
      status: msg.status || MESSAGE_STATUS.SENT,
      type: msg.type || msg.messageType || 'text',
      timestamp: msg.timestamp || msg.createdAt || Date.now(),
      chatId: msg.chatId,
      metadata: msg.metadata,
    };
  }
  
  export const isImageFile = (file) => {
    return file.type.startsWith('image/');
  };
  
  export const getFileType = (file) => {
    if (file.type.startsWith('image/')) return MESSAGE_TYPES.IMAGE;
    if (file.type.startsWith('video/')) return MESSAGE_TYPES.VIDEO;
    if (file.type.startsWith('audio/')) return MESSAGE_TYPES.AUDIO;
    return MESSAGE_TYPES.FILE;
  };