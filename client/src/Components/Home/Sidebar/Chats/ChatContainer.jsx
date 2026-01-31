import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useSocket } from '../../socket/socketUtils'; // Use your existing socket hook
import ChatService from '../../socket/chatService';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import { v4 as uuidv4 } from 'uuid';

const ChatContainer = ({ receiverId, receiverData }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  
  const socket = useSocket();
  const chatServiceRef = useRef(null);

  useEffect(() => {
    // Initialize chat service
    chatServiceRef.current = new ChatService(socket);

    // Setup chat event handlers
    const callbacks = {
      onMessageReceived: handleNewMessage,
      onTypingStatus: handleTypingStatus,
      onMessageStatus: handleMessageStatus,
      onError: handleError
    };

    // Initialize listeners and get cleanup function
    const cleanup = chatServiceRef.current.initializeChatListeners(callbacks);

    return () => {
      cleanup();
      chatServiceRef.current.destroy();
    };
  }, [socket]);

  useEffect(() => {
    const initializeChat = async () => {
      if (!receiverId || !chatServiceRef.current) return;

      try {
        const newChatId = await chatServiceRef.current.createChat(receiverId);
        setChatId(newChatId);
        await chatServiceRef.current.joinChat(newChatId);
      } catch (err) {
        setError('Failed to initialize chat');
        console.error(err);
      }
    };

    initializeChat();
  }, [receiverId]);

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    
    // Mark message as delivered
    if (message.senderId !== socket.id) {
      chatServiceRef.current?.markMessageAsDelivered(chatId, message.id);
    }
  };

  const handleTypingStatus = ({ userId, isTyping }) => {
    if (userId === receiverId) {
      setIsTyping(isTyping);
    }
  };

  const handleMessageStatus = ({ messageId, status }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    ));
  };

  const handleError = (error) => {
    setError(error.message || 'An error occurred');
    console.error('Chat error:', error);
  };

  const handleSendMessage = async (text) => {
    if (!chatServiceRef.current) return;
    // Generate a temporary ID for optimistic UI
    const tempId = uuidv4();
    const optimisticMessage = {
      id: tempId,
      text,
      senderId: socket.id,
      timestamp: Date.now(),
      status: 'pending',
    };
    setMessages(prev => [...prev, optimisticMessage]);
    try {
      const { messageId, timestamp } = await chatServiceRef.current.sendMessage(
        chatId,
        receiverId,
        { type: 'text', content: text }
      );
      setMessages(prev =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: messageId, timestamp, status: 'sent' }
            : m
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: 'failed' } : m
        )
      );
      setError('Failed to send message');
      console.error(err);
    }
  };

  const handleTyping = (isTyping) => {
    if (chatId && chatServiceRef.current) {
      chatServiceRef.current.handleTyping(chatId, isTyping);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <ChatHeader 
        receiverData={receiverData}
        isTyping={isTyping}
      />
      <MessageList 
        messages={messages}
        currentUserId={socket.id}
        onMessageSeen={(messageId) => {
          chatServiceRef.current?.markMessageAsSeen(chatId, messageId);
        }}
      />
      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
};

ChatContainer.propTypes = {
  receiverId: PropTypes.string.isRequired,
  receiverData: PropTypes.object.isRequired,
};

export default ChatContainer;