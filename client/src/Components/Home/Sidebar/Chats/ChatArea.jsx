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

const ChatArea = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const { socket } = useSocketContext();
  const chatServiceRef = useRef(null);
  const currentUserId = useSelector(state => state.userInfo?.data?._id);

  // First useEffect to handle socket authentication and ChatService initialization
  useEffect(() => {
    const initializeSocketAndService = async () => {
      try {
        if (!isSocketAuthenticated()) {
          await ensureSocketAuthenticated();
        }
        if (socket && !chatServiceRef.current) {
          chatServiceRef.current = new ChatService(socket);
          setIsSocketReady(true);
        } else if (socket && chatServiceRef.current) {
          chatServiceRef.current.updateSocket(socket);
          setIsSocketReady(true);
        }
      } catch {
        setIsSocketReady(false);
      }
    };
    initializeSocketAndService();
    return () => {
      if (chatServiceRef.current) {
        chatServiceRef.current.destroy();
        chatServiceRef.current = null;
        setIsSocketReady(false);
      }
    };
  }, [socket]);

  // Listen for chat events and update message status
  useEffect(() => {
    if (!chatServiceRef.current) return;
    const cleanup = chatServiceRef.current.initializeChatListeners({
      onMessageReceived: (msg) => {
        const formattedMsg = formatMessage(msg.data || msg);
        setMessages((prev) => [...prev, formattedMsg]);
        // Emit delivered-ack if the message is from the other user
        if (
          formattedMsg.senderId !== socket.id &&
          chatServiceRef.current &&
          formattedMsg.id // messageId
        ) {
          // Use chatId from state or from the message if available
          const currentChatId = chatId || formattedMsg.chatId;
          if (currentChatId) {
            chatServiceRef.current.markMessageAsDelivered(currentChatId, formattedMsg.id);
          }
        }
      },
      onSentAck: (ack) => {
        // If chatId is not set, set it from ack if available
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
        setMessages((prev) =>
          prev.map((m) =>
            m.id === ack.data?.messageId ? { ...m, status: MESSAGE_STATUS.SEEN } : m
          )
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
    return cleanup;
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
          console.log('Chat history received from server:', chat.messages);
          setMessages((chat.messages || []).map(formatMessage));
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

  // Handlers for sending messages, typing, etc.
  const handleSendMessage = async (messageData) => {
    if (!chatServiceRef.current) return;
    // Generate a temporary ID for optimistic UI
    const tempId = uuidv4();
    const optimisticMessage = formatMessage({
      id: tempId,
      type: messageData.type,
      content: messageData.content,
      senderId: currentUserId,
      receiverId: selectedUser._id,
      timestamp: Date.now(),
      status: MESSAGE_STATUS.PENDING,
      metadata: messageData.metadata,
    });
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const { messageId, timestamp } = await chatServiceRef.current.sendMessage(
        chatId,
        selectedUser._id,
        messageData
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: messageId, timestamp, status: MESSAGE_STATUS.SENT }
            : m
        )
      );
      // If chatId was null, it will be set on sent-ack
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: MESSAGE_STATUS.FAILED } : m
        )
      );
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
    <div className='flex-1 flex flex-col'>
      {renderError()}
      <ChatHeader
        receiverData={{
          name: selectedUser?.fullName || selectedUser?.name || selectedUser?.username || 'User',
          username: selectedUser?.username || '',
          avatar: selectedUser?.profilePhoto?.url || '',
          status: selectedUser?.isActive ? 'online' : 'offline',
          lastSeen: selectedUser?.lastSeen || '',
        }}
        isTyping={isTyping}
        onBack={() => {}}
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
};

export default ChatArea;
