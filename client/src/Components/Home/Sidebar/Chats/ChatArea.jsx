// src/Components/Home/Sidebar/Chats/ChatArea.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../../../socket/config'
import ChatService from '../../../../socket/chatService';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { MESSAGE_TYPES, MESSAGE_STATUS, formatMessage } from '../../../../utils/MessageUtils';

const ChatArea = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);
  
  const socket = useSocket();
  const chatServiceRef = useRef(null);

  // Single useEffect for socket and chat service initialization

  useEffect(() => {
    if (!socket) return; // Exit if socket isn't available

    // Set socket ID
    setSocketId(socket.id);

    // Initialize or update chat service
    if (!chatServiceRef.current) {
      chatServiceRef.current = new ChatService(socket);
    } else {
      chatServiceRef.current.updateSocket(socket);
    }

    const callbacks = {
      onMessageReceived: handleNewMessage,
      onTypingStatus: handleTypingStatus,
      onMessageStatus: handleMessageStatus,
      onError: handleError
    };

    const cleanup = chatServiceRef.current.initializeChatListeners(callbacks);

    return () => {
      cleanup();
      if (chatServiceRef.current) {
        chatServiceRef.current.destroy();
      }
    };
  }, [socket]);


  // Separate useEffect for chat initialization when user is selected
useEffect(() => {
    const initializeChat = async () => {
        if (!socket || !selectedUser?.id || !chatServiceRef.current) return;

        try {
            // Listen for first-time chat events
            chatServiceRef.current.listenToFirstTimeChat((data) => {
                // Handle first-time chat creation
                console.log('First time chat created:', data);
                // You can show a welcome message or tutorial
                setMessages(prev => [...prev, {
                    id: 'welcome',
                    type: 'system',
                    content: 'Welcome to your new chat!',
                    timestamp: Date.now()
                }]);
            });

            const newChatId = await chatServiceRef.current.createChat(selectedUser.id);
            setChatId(newChatId);
        } catch (err) {
            setError('Failed to initialize chat');
            console.error(err);
        }
    };

    initializeChat();
}, [selectedUser, socket]);

  const handleNewMessage = (message) => {
    const formattedMessage = formatMessage(message);
    setMessages(prev => [...prev, formattedMessage]);
    
    // Mark message as delivered if we're the receiver
    if (formattedMessage.senderId !== socket.id && chatServiceRef.current) {
      chatServiceRef.current.markMessageAsDelivered(chatId, formattedMessage.id);
    }
  };

  const handleTypingStatus = ({ userId, isTyping }) => {
    if (userId === selectedUser?.id) {
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

  const handleSendMessage = async (messageData) => {
    if (!chatId || !chatServiceRef.current) return;

    try {
      const { messageId, timestamp } = await chatServiceRef.current.sendMessage(
        chatId,
        selectedUser.id,
        messageData
      );

      const newMessage = formatMessage({
        id: messageId,
        type: messageData.type,
        content: messageData.content,
        senderId: socket.id,
        receiverId: selectedUser.id,
        timestamp,
        status: MESSAGE_STATUS.SENT,
        metadata: messageData.metadata
      });

      setMessages(prev => [...prev, newMessage]);
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
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

  const handleVideoCall = () => {
    // Implement video call functionality
    console.log('Video call with:', selectedUser?.id);
  };

  const handleVoiceCall = () => {
    // Implement voice call functionality
    console.log('Voice call with:', selectedUser?.id);
  };

  const handleMenuClick = () => {
    // Implement menu functionality
    console.log('Open chat menu');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }

//   // Add this effect to update socketId when socket is available
// useEffect(() => {
//     if (socket) {
//       if (!chatServiceRef.current) {
//         chatServiceRef.current = new ChatService(socket);
//       } else {
//         chatServiceRef.current.updateSocket(socket);
//       }
  
//       const callbacks = {
//         onMessageReceived: handleNewMessage,
//         onTypingStatus: handleTypingStatus,
//         onMessageStatus: handleMessageStatus,
//         onError: handleError
//       };
  
//       const cleanup = chatServiceRef.current.initializeChatListeners(callbacks);
  
//       return () => {
//         cleanup();
//         if (chatServiceRef.current) {
//           chatServiceRef.current.destroy();
//         }
//       };
//     }
//   }, [socket]);

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader 
        receiverData={{
          name: selectedUser.name,
          status: selectedUser.status,
          avatar: selectedUser.avatar,
          lastSeen: selectedUser.lastSeen
        }}
        isTyping={isTyping}
        onBack={() => {}} // Implement if needed
        onVideoCall={handleVideoCall}
        onVoiceCall={handleVoiceCall}
        onMenuClick={handleMenuClick}
      />

      <MessageList 
        messages={messages}
        currentUserId={socketId}
        onMessageSeen={handleMessageSeen}
      />

      <MessageInput 
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
};

export default ChatArea;