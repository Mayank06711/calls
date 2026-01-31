const emitWithTimeout = (socket, event, data, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not initialized'));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);

    socket.emit(event, data, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
};

const handleSocketError = (error) => {
  console.error('Socket error:', error);
  // You can add more error handling logic here
  return error;
};

class ChatService {
  constructor(socket) {
      this.socket = socket;
      this.typingTimeout = null;
      this.messageCallbacks = new Map();
      this.events = new Map();
    }

// Initialize chat listeners
initializeChatListeners(callbacks) {
  if (!this.socket) {
    console.warn('Socket not initialized');
    return () => {}; // Return empty cleanup function
  }

  // ⚠️ CRITICAL: Do NOT set up 'message' listener here - it's handled globally by Chats.jsx
  // Only set up the other event listeners here
  const events = {
    // 'message' is handled by addMessageListener in Chats.jsx - DON'T add here!
    'sent-ack': callbacks.onSentAck,
    'delivered': callbacks.onDelivered,
    'seen': callbacks.onSeen,
    'typing:status': callbacks.onTypingStatus,
    'message:error': callbacks.onError || this.handleChatError,
    'system:message': callbacks.onSystemMessage,
  };

  // Store the onMessageReceived callback separately for ChatArea to use
  // This will be called by the global listener in Chats.jsx (not a duplicate listener)
  if (callbacks.onMessageReceived) {
    this.chatAreaMessageCallback = callbacks.onMessageReceived;
  }

  // Setup listeners (excluding 'message')
  Object.entries(events).forEach(([event, handler]) => {
    if (this.socket && typeof handler === 'function') {
      // Remove existing listener first to prevent duplicates
      const existingHandler = this.events.get(event);
      if (existingHandler) {
        this.socket.off(event, existingHandler);
      }
      this.socket.on(event, handler);
      this.events.set(event, handler); // Store for cleanup
    }
  });

  return () => {
    // Cleanup listeners (but NOT the global 'message' listener)
    if (this.socket) {
      this.events.forEach((handler, event) => {
        if (event !== 'message') { // Don't remove global message listener
          this.socket.off(event, handler);
        }
      });
      // Clear stored callbacks except 'message'
      const messageHandler = this.events.get('message');
      this.events.clear();
      if (messageHandler) {
        this.events.set('message', messageHandler);
      }
      this.chatAreaMessageCallback = null;
    }
  };
}

  // Add this method to update socket
updateSocket(socket) {
  this.socket = socket;
  if (this.events.size > 0) {
    // Reattach existing listeners to new socket
    this.events.forEach((handler, event) => {
      this.socket?.on(event, handler);
    });
  }
}
// Create new chat
async createChat(receiverId) {
  try {
    const response = await emitWithTimeout(this.socket, 'chat:create', {
      receiverId,
      timestamp: Date.now()
    });

    if (response.status === 'success') {
      return response.chatId;
    }
    throw new Error(response.message || 'Failed to create chat');
  } catch (error) {
    handleSocketError(error);
    throw error;
  }
}

// Join chat room
async joinChat(chatId) {
  try {
    const response = await emitWithTimeout(this.socket, 'chat:join', { chatId });
    return response.status === 'success';
  } catch (error) {
    handleSocketError(error);
    throw error;
  }
}

// Send message
// If chatId is null, server will create the chat and return chatId in sent-ack
async sendMessage(chatId, receiverId, messageData) {
  try {
    const messagePayload = {
      ...(chatId ? { chatId } : {}),
      receiverId,
      text: messageData.content || messageData.text,
      messageType: messageData.type || 'text',
      chatType: messageData.chatType || 'userToUser',
      timestamp: Date.now(),
    };
    const response = await emitWithTimeout(this.socket, 'message', messagePayload);
    // Fix: treat as success if messageId is present, even if status is missing
    if ((response && response.status === 'success') || (response && response.messageId)) {
      return {
        messageId: response.messageId,
        timestamp: response.timestamp,
        chatId: response.chatId, // server should return chatId in sent-ack
      };
    }
    throw new Error((response && response.message) || 'Failed to send message');
  } catch (error) {
    handleSocketError(error);
    throw error;
  }
}

// Handle typing status
handleTyping(chatId, isTyping) {
  clearTimeout(this.typingTimeout);

  const emitTypingStatus = (status) => {
    this.socket.emit('typing:status', {
      chatId,
      status,
      timestamp: Date.now()
    });
  };

  if (isTyping) {
    emitTypingStatus(true);
    this.typingTimeout = setTimeout(() => {
      emitTypingStatus(false);
    }, 2000);
  } else {
    emitTypingStatus(false);
  }
}

// Mark message as delivered
async markMessageAsDelivered(chatId, messageId) {
  try {
    await emitWithTimeout(this.socket, 'delivered-ack', {
      chatId,
      messageId,
      timestamp: Date.now()
    });
  } catch (error) {
    handleSocketError(error);
  }
}

// Mark message as seen
async markMessageAsSeen(chatId, messageId) {
  try {
    console.log('🔵 Emitting seen-ack to server:', { chatId, messageId });
    await emitWithTimeout(this.socket, 'seen-ack', {
      chatId,
      messageId,
      timestamp: Date.now()
    });
    console.log('✅ seen-ack emitted successfully');
  } catch (error) {
    console.error('❌ Error emitting seen-ack:', error);
    handleSocketError(error);
  }
}

// Handle chat errors
handleChatError(error) {
  console.error('Chat error:', error);
  // You can implement custom error handling here
}

// Cleanup resources
destroy() {
  clearTimeout(this.typingTimeout);
  this.messageCallbacks.clear();
}

  // Initialize or get existing chat
  async initializeOrGetChat(receiverId) {
      try {
          // First check if chat exists
          const existingChat = await this.checkExistingChat(receiverId);
          
          if (existingChat) {
              return existingChat;
          }

          // If no existing chat, create new one
          return await this.createNewChat(receiverId);
      } catch (error) {
          handleSocketError(error);
          throw error;
      }
  }

  // Check for existing chat
  async checkExistingChat(receiverId) {
      try {
          const response = await emitWithTimeout(this.socket, 'chat:check', {
              receiverId,
              timestamp: Date.now()
          });

          if (response.status === 'success' && response.chatExists) {
              return {
                  chatId: response.chatId,
                  history: response.history || [],
                  isNew: false
              };
          }
          return null;
      } catch (error) {
          handleSocketError(error);
          return null;
      }
  }

  // Create new chat with initial setup
  async createNewChat(receiverId) {
      try {
          const response = await emitWithTimeout(this.socket, 'chat:create', {
              receiverId,
              timestamp: Date.now(),
              metadata: {
                  isFirstTime: true,
                  createdAt: Date.now(),
                  participants: [this.socket.id, receiverId]
              }
          });

          if (response.status === 'success') {
              // Join the chat room
              await this.joinChat(response.chatId);

              return {
                  chatId: response.chatId,
                  isNew: true,
                  metadata: response.metadata
              };
          }
          throw new Error(response.message || 'Failed to create chat');
      } catch (error) {
          handleSocketError(error);
          throw error;
      }
  }

  // Add event listener for first-time chat
  listenToFirstTimeChat(callback) {
      if (!this.socket) return;

      this.socket.on('chat:firstTime', callback);
      this.events.set('chat:firstTime', callback);
  }

  async initializeChatWithRetry(initData, maxRetries = 3) {
    let retryCount = 0;
    let lastError = null;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    while (retryCount < maxRetries) {
      try {
        // Emit chat initialization event (should be 'chat:check')
        const response = await emitWithTimeout(
          this.socket, 
          'chat:check',
          {
            senderId: initData.senderId,
            receiverId: initData.receiverId,
            timestamp: Date.now(),
            retryAttempt: retryCount,
            clientTimestamp: Date.now(),
          },
          10000 // 10 second timeout
        );

        if (response.status === 'success') {
          // Validate response data
          if (!response.chat || !response.chat.chatId) {
            throw new Error('Invalid response: missing chatId');
          }
          // Join the chat room
          await this.joinChat(response.chat.chatId);
          return response.chat.chatId;
        }

        throw new Error(response.message || 'Chat initialization failed');

      } catch (error) {
        lastError = error;
        console.error(`Chat initialization attempt ${retryCount + 1} failed:`, error);

        // Check for specific errors that shouldn't retry
        if (
          error.message.includes('authentication') ||
          error.message.includes('unauthorized') ||
          error.message.includes('invalid token')
        ) {
          throw new Error('Authentication required');
        }

        // Exponential backoff
        await delay(Math.min(1000 * Math.pow(2, retryCount), 5000));
        retryCount++;
      }
    }

    // If we've exhausted all retries, throw the last error
    throw new Error(`Chat initialization failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  // Enhanced error handling for socket events
  handleSocketError(error, context = '') {
    const errorTypes = {
      NETWORK: 'network',
      AUTH: 'authentication',
      TIMEOUT: 'timeout',
      SERVER: 'server',
      UNKNOWN: 'unknown'
    };

    let errorType = errorTypes.UNKNOWN;
    let errorMessage = error.message || 'An unknown error occurred';

    // Categorize error
    if (error.message.includes('timeout')) {
      errorType = errorTypes.TIMEOUT;
      errorMessage = 'Request timed out. Please check your connection.';
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      errorType = errorTypes.AUTH;
      errorMessage = 'Authentication required. Please login again.';
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      errorType = errorTypes.NETWORK;
      errorMessage = 'Network connection issue. Please check your internet connection.';
    } else if (error.message.includes('server')) {
      errorType = errorTypes.SERVER;
      errorMessage = 'Server error. Please try again later.';
    }

    // Log error with context
    console.error(`Socket Error [${errorType}] ${context}:`, {
      type: errorType,
      message: errorMessage,
      originalError: error,
      timestamp: new Date().toISOString()
    });

    return {
      type: errorType,
      message: errorMessage
    };
  }

  // Add validation methods
  validateInitData(initData) {
    const required = ['senderId', 'receiverId', 'timestamp'];
    const missing = required.filter(field => !initData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (typeof initData.timestamp !== 'number') {
      throw new Error('Invalid timestamp format');
    }

    return true;
  }

  // Add event listener for sent-ack, delivered, seen, message:error, system:message
  addSentAckListener(callback) {
    if (this.socket) {
      this.socket.on('sent-ack', callback);
      this.events.set('sent-ack', callback);
    }
  }
  addDeliveredListener(callback) {
    if (this.socket) {
      this.socket.on('delivered', callback);
      this.events.set('delivered', callback);
    }
  }
  addSeenListener(callback) {
    if (this.socket) {
      this.socket.on('seen', callback);
      this.events.set('seen', callback);
    }
  }
  addMessageErrorListener(callback) {
    if (this.socket) {
      this.socket.on('message:error', callback);
      this.events.set('message:error', callback);
    }
  }
  addSystemMessageListener(callback) {
    if (this.socket) {
      this.socket.on('system:message', callback);
      this.events.set('system:message', callback);
    }
  }

  addMessageListener(callback) {
    if (this.socket) {
      // Remove any existing listener first to prevent duplicates
      const existingCallback = this.events.get('message');
      if (existingCallback) {
        this.socket.off('message', existingCallback);
      }
      
      // Create a wrapper that calls both the global callback AND the ChatArea callback
      const wrappedCallback = (msg) => {
        callback(msg); // Global handler (Chats.jsx)
        
        // Also call ChatArea's callback if registered
        if (this.chatAreaMessageCallback) {
          this.chatAreaMessageCallback(msg);
        }
      };
      
      this.socket.on('message', wrappedCallback);
      this.events.set('message', wrappedCallback);
      this._globalMessageCallback = callback; // Store original for reference
    }
  }

  removeMessageListener() {
    if (this.socket) {
      // Remove the stored callback reference (not the passed-in one)
      const existingCallback = this.events.get('message');
      if (existingCallback) {
        this.socket.off('message', existingCallback);
        this.events.delete('message');
        this._globalMessageCallback = null;
        console.log('🧹 Removed message listener');
      }
    }
  }
  
  // Method for ChatArea to register its callback (called by the global listener wrapper)
  setChatAreaMessageCallback(callback) {
    this.chatAreaMessageCallback = callback;
  }
  
  // Method to clear ChatArea callback when ChatArea unmounts
  clearChatAreaMessageCallback() {
    this.chatAreaMessageCallback = null;
  }

  async checkChatHistory(senderId, receiverId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:check', {
        senderId,
        receiverId,
        timestamp: Date.now(),
      });
      console.log('Chat history response:', response);
      if (response.status === 'success' && response.exists && response.chat) {
        return response.chat;
      }
      return null;
    } catch (error) {
      handleSocketError(error);
      return null;
    }
  }

  // ============ NEW METHODS FOR UNREAD SYSTEM ============

  /**
   * Get all chats with unread counts
   */
  async getChatList() {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:list', {}, 10000);
      console.log('Chat list response:', response);
      if (response.status === 'success') {
        return {
          chats: response.chats || [],
          totalChats: response.totalChats || 0,
          totalUnread: response.totalUnread || 0
        };
      }
      return { chats: [], totalChats: 0, totalUnread: 0 };
    } catch (error) {
      console.error('Error fetching chat list:', error);
      handleSocketError(error);
      return { chats: [], totalChats: 0, totalUnread: 0 };
    }
  }

  /**
   * Mark all messages as read when opening chat
   */
  async openChat(chatId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:open', { chatId }, 10000);
      console.log('Chat open response:', response);
      if (response.status === 'success') {
        return {
          success: true,
          markedCount: response.markedCount || 0,
          messageIds: response.messageIds || []
        };
      }
      return { success: false, markedCount: 0, messageIds: [] };
    } catch (error) {
      console.error('Error opening chat:', error);
      handleSocketError(error);
      return { success: false, markedCount: 0, messageIds: [] };
    }
  }

  /**
   * Check if a specific user is currently online
   */
  async checkUserOnline(userId) {
    try {
      const response = await emitWithTimeout(this.socket, 'user:check-online', { userId }, 5000);
      console.log('🔍 User online check response:', response);
      return { isOnline: response.isOnline || false, statusHidden: response.statusHidden || false };
    } catch (error) {
      console.error('Error checking user online status:', error);
      return { isOnline: false, statusHidden: false };
    }
  }

  /**
   * Get list of all currently online user IDs
   */
  async getOnlineUsers() {
    try {
      const response = await emitWithTimeout(this.socket, 'users:get-online', {}, 5000);
      console.log('🟢 Online users response:', response);
      return { onlineUserIds: response.onlineUserIds || [], hiddenUserIds: response.hiddenUserIds || [] };
    } catch (error) {
      console.error('Error getting online users:', error);
      return { onlineUserIds: [], hiddenUserIds: [] };
    }
  }

  // ============ MESSAGE DELETE METHODS ============

  /**
   * Delete message(s) for me only (soft-delete)
   * @param {string} chatId
   * @param {number|number[]} messageId - single ID or array of IDs
   */
  async deleteMessageForMe(chatId, messageId) {
    try {
      const response = await emitWithTimeout(this.socket, 'message:delete', { chatId, messageId });
      return response.status === 'success';
    } catch (error) {
      console.error('Error deleting message for me:', error);
      return false;
    }
  }

  /**
   * Delete message(s) for everyone (sender only, today only)
   * @param {string} chatId
   * @param {number|number[]} messageId - single ID or array of IDs
   * @returns {Promise<{success: boolean, deletedIds?: number[], skippedIds?: number[]}>}
   */
  async deleteMessageForEveryone(chatId, messageId) {
    try {
      const response = await emitWithTimeout(this.socket, 'message:delete-all', { chatId, messageId });
      if (response.status === 'success') {
        return { success: true, deletedIds: response.deletedIds, skippedIds: response.skippedIds };
      }
      return { success: false };
    } catch (error) {
      console.error('Error deleting message for everyone:', error);
      return { success: false };
    }
  }

  /**
   * Listen for messages deleted by other user (delete-for-everyone)
   */
  addMessageDeletedListener(callback) {
    if (this.socket) {
      const existing = this.events.get('message:deleted');
      if (existing) this.socket.off('message:deleted', existing);
      this.socket.on('message:deleted', callback);
      this.events.set('message:deleted', callback);
    }
  }

  /**
   * Listen for batch receipts (when user comes online)
   */
  addBatchReceiptsListener(callback) {
    if (this.socket) {
      this.socket.on('receipts:batch', callback);
      this.events.set('receipts:batch', callback);
    }
  }

  // ============ CHAT HIDE/DELETE METHODS ============

  async hideChat(chatId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:hide', { chatId });
      return response.status === 'success';
    } catch (error) {
      console.error('Error hiding chat:', error);
      return false;
    }
  }

  async unhideChat(chatId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:unhide', { chatId });
      return response.status === 'success';
    } catch (error) {
      console.error('Error unhiding chat:', error);
      return false;
    }
  }

  async deleteChat(chatId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:delete', { chatId });
      return response.status === 'success';
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  }

  async getHiddenChats() {
    try {
      const response = await emitWithTimeout(this.socket, 'chat:hidden-list', {}, 10000);
      if (response.status === 'success') {
        return response.chats || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching hidden chats:', error);
      return [];
    }
  }

  // ============ CHAT REQUEST SYSTEM ============

  async sendChatRequest(receiverId) {
    try {
      const response = await emitWithTimeout(this.socket, 'chat-request:send', { receiverId });
      return response;
    } catch (error) {
      console.error('Error sending chat request:', error);
      return { status: 'error', message: error.message };
    }
  }

  async respondToChatRequest(requestId, action) {
    try {
      console.log(`[ChatService] respondToChatRequest: requestId=${requestId}, action=${action}, socket connected=${this.socket?.connected}`);
      const response = await emitWithTimeout(this.socket, 'chat-request:respond', { requestId, action }, 10000);
      console.log('[ChatService] respondToChatRequest response:', response);
      return response;
    } catch (error) {
      console.error('[ChatService] Error responding to chat request:', error);
      return { status: 'error', message: error.message };
    }
  }

  async getChatRequests(type = 'received') {
    try {
      const response = await emitWithTimeout(this.socket, 'chat-request:list', { type }, 10000);
      return response.status === 'success' ? response.requests : [];
    } catch (error) {
      console.error('Error fetching chat requests:', error);
      return [];
    }
  }

  async getChatRequestStatus(otherUserId, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await emitWithTimeout(this.socket, 'chat-request:status', { otherUserId });
        return response;
      } catch (error) {
        console.warn(`[ChatService] chat-request:status attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt < maxRetries) {
          // Wait before retrying: 1s, 2s (increasing delay)
          await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }
    console.error('[ChatService] chat-request:status all retries exhausted');
    return { status: 'error', requestStatus: 'error' };
  }

  addChatRequestReceivedListener(callback) {
    if (this.socket) {
      const existing = this.events.get('chat-request:received');
      if (existing) this.socket.off('chat-request:received', existing);
      this.socket.on('chat-request:received', callback);
      this.events.set('chat-request:received', callback);
    }
  }

  addChatRequestResponseListener(callback) {
    if (this.socket) {
      const existing = this.events.get('chat-request:response');
      if (existing) this.socket.off('chat-request:response', existing);

      // Wrapper: call both global (Chats.jsx) and ChatArea callback
      const wrappedCallback = (data) => {
        console.log('[ChatService] chat-request:response received:', data);
        callback(data); // Global handler
        if (this._chatRequestResponseCallback) {
          this._chatRequestResponseCallback(data);
        }
      };

      this.socket.on('chat-request:response', wrappedCallback);
      this.events.set('chat-request:response', wrappedCallback);
    }
  }

  // ChatArea registers its own callback (called by the wrapped listener above)
  setChatRequestResponseCallback(callback) {
    this._chatRequestResponseCallback = callback;
  }

  clearChatRequestResponseCallback() {
    this._chatRequestResponseCallback = null;
  }
}

export default ChatService;