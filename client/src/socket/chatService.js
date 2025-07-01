
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

  const events = {
    'message:received': callbacks.onMessageReceived,
    'typing:status': callbacks.onTypingStatus,
    'message:status': callbacks.onMessageStatus,
    'chat:error': callbacks.onError || this.handleChatError,
  };

  // Setup listeners
  Object.entries(events).forEach(([event, handler]) => {
    if (this.socket && typeof handler === 'function') {
      this.socket.on(event, handler);
      this.events.set(event, handler); // Store for cleanup
    }
  });

  return () => {
    // Cleanup listeners
    if (this.socket) {
      this.events.forEach((handler, event) => {
        this.socket.off(event, handler);
      });
      this.events.clear();
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
async sendMessage(chatId, receiverId, text) {
  try {
    const messageData = {
      chatId,
      receiverId,
      text,
      timestamp: Date.now(),
      type: 'text' // Can be extended for different message types
    };

    const response = await emitWithTimeout(this.socket, 'message:send', messageData);

    if (response.status === 'success') {
      return {
        messageId: response.messageId,
        timestamp: response.timestamp
      };
    }
    throw new Error(response.message || 'Failed to send message');
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
    await emitWithTimeout(this.socket, 'message:delivered', {
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
    await emitWithTimeout(this.socket, 'message:seen', {
      chatId,
      messageId,
      timestamp: Date.now()
    });
  } catch (error) {
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
        // Emit chat initialization event
        const response = await emitWithTimeout(
          this.socket, 
          'chat:initialization', 
          {
            ...initData,
            retryAttempt: retryCount,
            clientTimestamp: Date.now()
          },
          10000 // 10 second timeout
        );

        if (response.status === 'success') {
          // Validate response data
          if (!response.chatId) {
            throw new Error('Invalid response: missing chatId');
          }

          // Join the chat room, need to see it
          await this.joinChat(response.chatId);

          // Send initialization success message
          await this.sendSystemMessage(response.chatId, 'CHAT_INITIALIZED', {
            timestamp: Date.now(),
            metadata: {
              isFirstTime: true,
              initializationData: initData
            }
          });

          return response.chatId;
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


}

export default ChatService;