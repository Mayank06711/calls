// src/Components/Home/Sidebar/Chats/ChatArea.jsx
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useSocketContext } from "../../../../socket/SocketContext";
import ChatService from "../../../../socket/chatService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { MESSAGE_STATUS, formatMessage } from "../../../../utils/MessageUtils";
import {
  ensureSocketAuthenticated,
  isSocketAuthenticated,
} from "../../../../socket/authentication";
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from "react-redux";

const ChatArea = ({ selectedUser, chatServiceRef, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false); // Track real-time online status
  const { socket } = useSocketContext();
  // chatServiceRef is now passed as prop from Chats.jsx (shared instance)
  const messagesEndRef = useRef(null);
  const currentUserId = useSelector(state => state.auth?.userId);

  // Update isSocketReady based on chatServiceRef from parent
  useEffect(() => {
    const initializeSocketAndService = async () => {
      try {
        if (!isSocketAuthenticated()) {
          await ensureSocketAuthenticated();
        }
        // chatServiceRef is passed from Chats.jsx, just check if it's ready
        if (chatServiceRef?.current) {
          setIsSocketReady(true);
        }
      } catch {
        setIsSocketReady(false);
      }
    };
    initializeSocketAndService();
    
    // No cleanup needed - Chats.jsx owns the chatServiceRef
  }, [socket, chatServiceRef]);

  // Listen for user:online and user:offline events to track real-time status
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleUserOnline = (data) => {
      if (data.userId === selectedUser._id) {
        console.log('🟢 User came ONLINE:', selectedUser._id);
        setIsUserOnline(true);
      }
    };

    const handleUserOffline = (data) => {
      if (data.userId === selectedUser._id) {
        console.log('🔴 User went OFFLINE:', selectedUser._id);
        setIsUserOnline(false);
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    // Check CURRENT online status when opening this chat
    // This handles the case where user was already online before we opened the chat
    const checkInitialOnlineStatus = async () => {
      if (chatServiceRef.current && selectedUser._id) {
        const isOnline = await chatServiceRef.current.checkUserOnline(selectedUser._id);
        console.log(`🔍 Initial online status for ${selectedUser._id}:`, isOnline);
        setIsUserOnline(isOnline);
      }
    };
    
    // Small delay to ensure chatService is ready
    const timeoutId = setTimeout(checkInitialOnlineStatus, 100);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      clearTimeout(timeoutId);
    };
  }, [socket, selectedUser]);

  // Listen for chat events and update message status
  useEffect(() => {
    if (!chatServiceRef.current) return;
    
    // Define the message handler for ChatArea
    const messageHandler = (msg) => {
      const formattedMsg = formatMessage(msg.data || msg);
      const isFromHistory = msg.isFromHistory || msg.data?.isFromHistory;
      
      console.log('📨 [ChatArea] Message received:', {
        messageId: formattedMsg.id,
        chatId: formattedMsg.chatId,
        senderId: formattedMsg.senderId,
        receiverId: formattedMsg.receiverId,
        currentUserId,
        selectedUserId: selectedUser?._id,
        isFromHistory,
        isFromOther: formattedMsg.senderId !== currentUserId
      });
      
      // ✅ CRITICAL FIX: Only add message to UI if it belongs to THIS chat
      // Check if message is from the user we're currently chatting with OR it's our own message
      const belongsToThisChat = 
        formattedMsg.senderId === selectedUser?._id || // Message from the person we're chatting with
        formattedMsg.senderId === currentUserId; // Our own message being echoed back
      
      if (!belongsToThisChat) {
        console.log('⚠️ [ChatArea] Ignoring message - does not belong to current chat');
        return; // Don't add to messages or send seen-ack
      }
      
      // ⚠️ CRITICAL: Prevent duplicate messages by checking if ID already exists
      setMessages((prev) => {
        // Check if message with this ID already exists
        const exists = prev.some(m => m.id === formattedMsg.id);
        if (exists) {
          console.log('⏭️ [ChatArea] Skipping duplicate message (already in list):', formattedMsg.id);
          return prev; // Don't add duplicate
        }
        console.log('✅ [ChatArea] Adding new message to list:', formattedMsg.id);
        return [...prev, formattedMsg];
      });
      
      // ⚠️ CRITICAL: ONLY send seen-ack for NEW real-time messages, NOT history messages
      if (
        !isFromHistory && 
        formattedMsg.senderId !== currentUserId &&
        chatServiceRef.current &&
        formattedMsg.id
      ) {
        const currentChatId = chatId || formattedMsg.chatId;
        if (currentChatId) {
          console.log('✅ [ChatArea] Marking NEW message as SEEN (chat is open)');
          chatServiceRef.current.markMessageAsSeen(currentChatId, formattedMsg.id);
        }
      }
    };
    
    // Register ChatArea's message callback (will be called by global listener wrapper)
    chatServiceRef.current.setChatAreaMessageCallback(messageHandler);
    
    // Set up other event listeners (not message - that's handled globally)
    const cleanup = chatServiceRef.current.initializeChatListeners({
      // onMessageReceived is NOT set here - it's handled via setChatAreaMessageCallback
      onSentAck: (ack) => {
        if (!chatId && ack.data?.chatId) {
          setChatId(ack.data.chatId);
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === ack.data?.messageId ? { ...m, status: MESSAGE_STATUS.SENT } : m
          )
        );
      },
      onDelivered: (ack) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === ack.data?.messageId ? { ...m, status: MESSAGE_STATUS.DELIVERED } : m
          )
        );
      },
      onSeen: (ack) => {
        console.log('👀 Received SEEN event from server:', ack);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === ack.data?.messageId) {
              console.log(`✅ Updating message ${m.id} to SEEN status`);
              return { ...m, status: MESSAGE_STATUS.SEEN };
            }
            return m;
          })
        );
      },
      onTypingStatus: () => {},
      onError: (err) => {
        setError(err.data?.message || err.message || 'Message error');
      },
      onSystemMessage: (msg) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            type: 'system',
            content: msg.data?.content || 'System message',
            timestamp: Date.now(),
            metadata: msg.data,
          },
        ]);
      },
    });

    // NEW: Listen for batch receipts
    chatServiceRef.current.addBatchReceiptsListener((data) => {
      console.log('Received batch receipts:', data);
      const { receipts } = data.data || data;
      if (receipts && receipts.length > 0) {
        setMessages((prev) =>
          prev.map((msg) => {
            const receipt = receipts.find((r) => r.messageId === msg.id);
            return receipt
              ? { ...msg, status: MESSAGE_STATUS.SEEN, readAt: receipt.readAt }
              : msg;
          })
        );
      }
    });

    return () => {
      cleanup(); // Clean up other listeners
      // Also clear ChatArea's message callback when unmounting
      if (chatServiceRef.current) {
        chatServiceRef.current.clearChatAreaMessageCallback();
      }
    };
  }, [isSocketReady, chatId]);

  // Reset chatId and messages when selectedUser changes
  useEffect(() => {
    setChatId(null);
    setMessages([]);
  }, [selectedUser]);

  // Add error display component
  const renderError = () => {
    // Only show error if all messages are failed or pending
    const allFailedOrPending = messages.length > 0 && messages.every(m => m.status === MESSAGE_STATUS.FAILED || m.status === MESSAGE_STATUS.PENDING);
    if (error && allFailedOrPending) {
      return (
        <div className='flex flex-col items-center justify-center p-4 bg-red-50 rounded-md'>
          <p className='text-red-600'>{error}</p>
          <button
            className='mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md'
            onClick={() => {
              setError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      setChatId(null);
      setMessages([]);
      if (!selectedUser || !chatServiceRef.current || !currentUserId) return;
      try {
        const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
        if (chat) {
          setChatId(chat.chatId);
          console.log('Chat history received from server:', chat);
          setMessages((chat.messages || []).map(formatMessage));

          // NEW: Mark all messages as read when opening chat
          const result = await chatServiceRef.current.openChat(chat.chatId);
          if (result.success && result.markedCount > 0) {
            console.log(`Marked ${result.markedCount} messages as read`);
            // Update local state to show all as seen
            setMessages((prev) =>
              prev.map((msg) =>
                msg.senderId !== currentUserId
                  ? { ...msg, status: MESSAGE_STATUS.SEEN }
                  : msg
              )
            );
          }
        }
      } catch {
        setMessages([]);
      }
    };
    fetchChatHistory();
  }, [selectedUser, isSocketReady, currentUserId]);

  if (!selectedUser) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-gray-500'>Select a chat to start messaging</p>
      </div>
    );
  }

  if (!isSocketReady) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='flex flex-col items-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
          <p className='mt-2 text-gray-600'>Initializing chat service...</p>
        </div>
      </div>
    );
  }

  
// Helper to update a message by content and timestamp (for optimistic messages)
const updateOptimisticMessage = (content, timestamp, updater) => {
  setMessages(prev =>
    prev.map(msg => 
      (msg.content === content && msg.timestamp === timestamp && !msg.id) 
        ? updater(msg) 
        : msg
    )
  );
};

  // Handlers for sending messages, typing, etc.
  const handleSendMessage = async (messageData) => {
    if (!chatServiceRef.current) return;
  
    const currentTimestamp = Date.now();
    
    const optimisticMessage = formatMessage({
      id: null, // Direct null ID
      chatId,
      type: messageData.type,
      content: messageData.content,
      senderId: currentUserId,
      receiverId: selectedUser._id,
      timestamp: currentTimestamp,
      status: MESSAGE_STATUS.PENDING,
      metadata: messageData.metadata,
    });
  
    // Add optimistic message to the end
    setMessages(prev => [...prev, optimisticMessage]);
  
    try {
      const { messageId, timestamp } = await chatServiceRef.current.sendMessage(
        chatId,
        selectedUser._id,
        messageData
      );
      
      // Update optimistic message with real ID
      updateOptimisticMessage(messageData.content, currentTimestamp, msg => ({
        ...msg,
        chatId,
        id: messageId,
        timestamp,
        status: MESSAGE_STATUS.SENT,
      }));
    } catch (err) {
      // Update optimistic message as failed
      updateOptimisticMessage(messageData.content, currentTimestamp, msg => ({
        ...msg,
        status: MESSAGE_STATUS.FAILED,
        error: "Failed to send message",
      }));
      setError("Failed to send message");
    }
  };
  

  const handleTyping = (isTyping) => {
    if (chatId && chatServiceRef.current) {
      chatServiceRef.current.handleTyping(chatId, isTyping);
    }
  };

  const handleMessageSeen = (messageId) => {
    if (chatId && chatServiceRef.current) {
      chatServiceRef.current.markMessageAsSeen(chatId, messageId);
    }
  };

  const handleVideoCall = () => {};
  const handleVoiceCall = () => {};
  const handleMenuClick = () => {};

  return (
    <div className='h-full w-full flex-1 flex flex-col overflow-hidden bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text'>
      {renderError()}
      <ChatHeader
        receiverData={{
          name: selectedUser?.fullName || selectedUser?.name || selectedUser?.username || 'User',
          username: selectedUser?.username || '',
          avatar: selectedUser?.profilePhoto?.url || '',
          status: isUserOnline ? 'online' : 'offline', // Real-time socket-based status
          lastSeen: selectedUser?.lastSeen || '',
        }}
        isTyping={isTyping}
        onBack={onBack}
        onVideoCall={handleVideoCall}
        onVoiceCall={handleVoiceCall}
        onMenuClick={handleMenuClick}
        lastMessage={messages.length > 0 ? messages[messages.length - 1] : null}
        currentUserId={currentUserId}
      />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onMessageSeen={handleMessageSeen}
      />
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
};

ChatArea.propTypes = {
  selectedUser: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    fullName: PropTypes.string,
    username: PropTypes.string,
    status: PropTypes.string,
    avatar: PropTypes.string,
    lastSeen: PropTypes.string,
    profilePhoto: PropTypes.shape({
      url: PropTypes.string,
    }),
    isActive: PropTypes.bool,
  }),
  chatServiceRef: PropTypes.shape({
    current: PropTypes.object,
  }),
  onBack: PropTypes.func, // Back button handler for mobile
};

export default ChatArea;
