// src/Components/Home/Sidebar/Chats/ChatArea.jsx

import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../../../../socket/config";
import ChatService from "../../../../socket/chatService";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { MESSAGE_STATUS, formatMessage } from "../../../../utils/MessageUtils";
import {
  ensureSocketAuthenticated,
  isSocketAuthenticated,
} from "../../../../socket/authentication";

const ChatArea = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [socketId, setSocketId] = useState(null);
  
  // Add new state for initialization status
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState(null);
  // Add socket ready state
  const [isSocketReady, setIsSocketReady] = useState(false);
  console.log("selected user", selectedUser);
  const socket = useSocket();
  const chatServiceRef = useRef(null);

  // First useEffect to handle socket authentication and ChatService initialization
  useEffect(() => {
    const initializeSocketAndService = async () => {
      try {
        // First ensure socket is authenticated
        if (!isSocketAuthenticated()) {
          await ensureSocketAuthenticated();
        }

        // Only initialize ChatService if socket is available and authenticated
        if (socket && !chatServiceRef.current) {
          chatServiceRef.current = new ChatService(socket);
          setIsSocketReady(true);
          console.log("ChatService initialized:", chatServiceRef.current);
        } else if (socket && chatServiceRef.current) {
          // Update socket if service exists but socket changed
          chatServiceRef.current.updateSocket(socket);
          setIsSocketReady(true);
          console.log("ChatService socket updated");
        }
      } catch (error) {
        console.error("Failed to initialize socket/chat service:", error);
        setIsSocketReady(false);
      }
    };

    initializeSocketAndService();

    // Cleanup function
    return () => {
      if (chatServiceRef.current) {
        chatServiceRef.current.destroy();
        chatServiceRef.current = null;
        setIsSocketReady(false);
      }
    };
  }, [socket]); // Depend only on socket changes

  //chat initialization
  useEffect(() => {
    const initializeChat = async () => {
      // Only proceed if all required dependencies are available
      if (!isSocketReady || !chatServiceRef.current || !selectedUser?._id) {
        console.log("Missing dependencies:", {
          isSocketReady,
          chatService: !!chatServiceRef.current,
          selectedUserId: selectedUser?._id,
        });
        return;
      }
      setIsInitializing(true);
      setInitializationError(null);

      try {
        // First check socket authentication
        if (!isSocketAuthenticated()) {
          await ensureSocketAuthenticated();
        }

        // Get sender ID from localStorage
        const senderId = localStorage.getItem("userId");
        if (!senderId) {
          throw new Error("User authentication required");
        }

        // Prepare initialization data
        const initData = {
          senderId,
          receiverId: selectedUser._id,
          timestamp: Date.now(),
          metadata: {
            initializationTime: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            platform: navigator.platform,
            isFirstTime: true,
          },
        };

        // Listen for first-time chat events
        chatServiceRef.current.listenToFirstTimeChat((data) => {
          console.log("First time chat created:", data);
          setMessages((prev) => [
            ...prev,
            {
              id: "welcome",
              type: "system",
              content: "Welcome to your new chat!",
              timestamp: Date.now(),
              metadata: {
                isFirstTimeChat: true,
                initializationData: data,
              },
            },
          ]);
        });

        // Initialize chat with error handling and retries
        const newChatId = await chatServiceRef.current.initializeChatWithRetry(
          initData
        );

        if (!newChatId) {
          throw new Error("Failed to get chat ID");
        }

        setChatId(newChatId);
        setIsInitializing(false);
      } catch (err) {
        console.error("Chat initialization error:", err);

        let errorMessage = "Failed to initialize chat";
        if (err.message.includes("authentication")) {
          errorMessage = "Please login again to continue";
        } else if (err.message.includes("network")) {
          errorMessage =
            "Network connection issue. Please check your connection";
        }

        setInitializationError(errorMessage);
        setError(errorMessage);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [selectedUser, socket]);

  // Add a debug effect to monitor important states
  useEffect(() => {
    console.log("Current state:", {
      isSocketReady,
      chatService: !!chatServiceRef.current,
      socket: !!socket,
      selectedUser: !!selectedUser,
    });
  }, [isSocketReady, socket, selectedUser]);

  // Separate useEffect for chat initialization when user is selected
  useEffect(() => {
    const initializeChat = async () => {
      if (!socket || !selectedUser?.id || !chatServiceRef.current) return;

      try {
        // Listen for first-time chat events
        chatServiceRef.current.listenToFirstTimeChat((data) => {
          // Handle first-time chat creation
          console.log("First time chat created:", data);
          // You can show a welcome message or tutorial
          setMessages((prev) => [
            ...prev,
            {
              id: "welcome",
              type: "system",
              content: "Welcome to your new chat!",
              timestamp: Date.now(),
            },
          ]);
        });

        const newChatId = await chatServiceRef.current.createChat(
          selectedUser.id
        );
        setChatId(newChatId);
      } catch (err) {
        setError("Failed to initialize chat");
        console.error(err);
      }
    };

    initializeChat();
  }, [selectedUser, socket]);

  const handleNewMessage = (message) => {
    const formattedMessage = formatMessage(message);
    setMessages((prev) => [...prev, formattedMessage]);

    // Mark message as delivered if we're the receiver
    if (formattedMessage.senderId !== socket.id && chatServiceRef.current) {
      chatServiceRef.current.markMessageAsDelivered(
        chatId,
        formattedMessage.id
      );
    }
  };

  const handleTypingStatus = ({ userId, isTyping }) => {
    if (userId === selectedUser?.id) {
      setIsTyping(isTyping);
    }
  };

  const handleMessageStatus = ({ messageId, status }) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, status } : msg))
    );
  };

  const handleError = (error) => {
    setError(error.message || "An error occurred");
    console.error("Chat error:", error);
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
        metadata: messageData.metadata,
      });

      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      setError("Failed to send message");
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
    console.log("Video call with:", selectedUser?.id);
  };

  const handleVoiceCall = () => {
    // Implement voice call functionality
    console.log("Voice call with:", selectedUser?.id);
  };

  const handleMenuClick = () => {
    // Implement menu functionality
    console.log("Open chat menu");
  };

  if (error) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className='flex items-center justify-center h-full'>
        <p className='text-gray-500'>Select a chat to start messaging</p>
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

  // Add error display component
  const renderError = () => {
    if (initializationError) {
      return (
        <div className='flex flex-col items-center justify-center p-4 bg-red-50 rounded-md'>
          <p className='text-red-600'>{initializationError}</p>
          <button
            className='mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-md'
            onClick={() => {
              setInitializationError(null);
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

  return (
    <div className='flex-1 flex flex-col'>
      {renderError()}
      <ChatHeader
        receiverData={{
          name: selectedUser.name,
          status: selectedUser.status,
          avatar: selectedUser.avatar,
          lastSeen: selectedUser.lastSeen,
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

      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
};

export default ChatArea;
