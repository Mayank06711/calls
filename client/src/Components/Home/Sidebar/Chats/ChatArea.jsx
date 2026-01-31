// src/Components/Home/Sidebar/Chats/ChatArea.jsx
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useSocketContext } from "../../../../socket/SocketContext";
import ChatService from "../../../../socket/chatService";
import { makeRequest } from "../../../../utils/apiHandlers";
import { ENDPOINTS } from "../../../../constants/apiEndpoints";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import SelectionToolbar from "./SelectionToolbar";
import { uploadImage } from "../../../../socket/handleImageUpload";
import { MESSAGE_STATUS, formatMessage } from "../../../../utils/MessageUtils";
import {
  ensureSocketAuthenticated,
  isSocketAuthenticated,
} from "../../../../socket/authentication";
import { v4 as uuidv4 } from 'uuid';
import { useSelector, useDispatch } from "react-redux";
import { showNotification } from "../../../../redux/actions/notification.actions"; // DEBUG — remove later
import { useVideoCallActions } from "../../../../hooks/useVideoCall";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { PersonAdd, HourglassEmpty, Check, Close } from "@mui/icons-material";
import { playChatSound } from "../../../../utils/notificationSound";
import { useAIContext } from "../../../../context/AIContext";

const ChatArea = ({ selectedUser, chatServiceRef, onBack, isExpert, lastRequestResponse }) => {
  const [messages, setMessages] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [isTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false); // Track real-time online status
  const [isUserHidden, setIsUserHidden] = useState(false); // Track hidden (appear offline) status
  const [requestStatus, setRequestStatus] = useState(null); // null = loading, "accepted" | "none" | "pending_sent" | "pending_received" | "cooldown"
  const [requestId, setRequestId] = useState(null); // for responding to received requests
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // seconds remaining
  const [reconnectCount, setReconnectCount] = useState(0); // bumped on socket reconnect to trigger re-fetch
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());
  const { socket, isConnected, isAuthenticated } = useSocketContext();
  const dispatch = useDispatch(); // DEBUG — remove later
  const { initiateCall, requestCallPermission } = useVideoCallActions();
  const colors = useSubscriptionColors();
  // chatServiceRef is now passed as prop from Chats.jsx (shared instance)
  const messagesEndRef = useRef(null);
  const currentUserId = useSelector(state => state.auth?.userId);
  const isAdmin = useSelector(state => state.auth?.userInfo?.isAdmin);
  const chatSoundEnabled = useSelector(state => state.settings?.data?.notifications?.chatSound ?? true);
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const displayName = selectedUser?.fullName || selectedUser?.name || selectedUser?.username || 'User';

  // --- AI Context: tell Strut AI what chat the user is looking at ---
  useEffect(() => {
    if (!selectedUser) return;
    const receiverIsExpert = selectedUser?.isExpert || false;
    const senderIsExpert = isExpert || false;
    const isPrivateChat = !receiverIsExpert && !senderIsExpert && !isAdmin;

    const chatCtx = {
      page: "chat",
      chatId: selectedUser._id,
      description: `User is chatting with ${displayName}${receiverIsExpert ? " (Expert)" : ""}`,
      chatContext: {
        receiverName: displayName,
        receiverRole: receiverIsExpert ? "expert" : "user",
        isPrivateChat,
        // Compact string summary instead of raw message objects
        ...(!isPrivateChat && messages.length > 0 && {
          recentConversation: messages.slice(-20).map(m =>
            `${m.senderId === currentUserId ? "me" : displayName}: ${m.type === "text" ? m.content : `[${m.type}]`}`
          ).join("\n"),
        }),
      },
    };
    setAIPageContext(chatCtx);

    return () => clearAIPageContext();
  }, [selectedUser?._id, displayName, isExpert, isAdmin, messages.length]);

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
        setIsUserHidden(false);
      }
    };

    const handleUserOffline = (data) => {
      if (data.userId === selectedUser._id) {
        console.log('🔴 User went OFFLINE:', selectedUser._id);
        setIsUserOnline(false);
      }
    };

    const handleUserHidden = (data) => {
      const userId = data.userId || data.data?.userId;
      if (userId === selectedUser._id) {
        console.log('🟡 User is HIDDEN:', selectedUser._id);
        setIsUserHidden(true);
        setIsUserOnline(false);
      }
    };

    const handleUserUnhidden = (data) => {
      const userId = data.userId || data.data?.userId;
      if (userId === selectedUser._id) {
        console.log('🟢 User UNHIDDEN:', selectedUser._id);
        setIsUserHidden(false);
      }
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('user:hidden', handleUserHidden);
    socket.on('user:unhidden', handleUserUnhidden);

    // Check CURRENT online status when opening this chat
    const checkInitialOnlineStatus = async () => {
      if (chatServiceRef.current && selectedUser._id) {
        const result = await chatServiceRef.current.checkUserOnline(selectedUser._id);
        console.log(`🔍 Initial online status for ${selectedUser._id}:`, result);
        setIsUserOnline(result.isOnline);
        setIsUserHidden(result.statusHidden);
      }
    };

    // Small delay to ensure chatService is ready
    const timeoutId = setTimeout(checkInitialOnlineStatus, 100);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user:hidden', handleUserHidden);
      socket.off('user:unhidden', handleUserUnhidden);
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

      // Play chat sound for incoming real-time messages from other users
      if (!isFromHistory && formattedMsg.senderId !== currentUserId && chatSoundEnabled) {
        playChatSound();
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

    // Listen for messages deleted by other user (delete-for-everyone)
    // Handles both single messageId and array messageIds
    chatServiceRef.current.addMessageDeletedListener((data) => {
      const payload = data.data || data;
      const ids = payload.messageIds || (payload.messageId ? [payload.messageId] : []);
      if (ids.length > 0) {
        const idSet = new Set(ids);
        setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
      }
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

  // Reset chatId, messages, and request status when selectedUser changes
  useEffect(() => {
    setChatId(null);
    setMessages([]);
    setRequestStatus(null);
    setRequestId(null);
    setCooldownRemaining(0);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
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
      setRequestStatus(null);
      if (!selectedUser || !chatServiceRef.current || !currentUserId) return;

      // Admin bypass: admins skip the request check
      if (isAdmin) {
        setRequestStatus("accepted");
      } else {
        // Check chat request status — socket (3 retries) → HTTP fallback
        try {
          let reqStatus = null;
          let statusSource = ""; // DEBUG — remove later

          // 1. Try socket (3 retries with increasing delay built into chatService)
          if (chatServiceRef.current) {
            reqStatus = await chatServiceRef.current.getChatRequestStatus(selectedUser._id);
            if (reqStatus && reqStatus.requestStatus !== "error") {
              statusSource = "socket"; // DEBUG — remove later
            }
          }

          // 2. If all socket retries failed, fall back to HTTP API
          if (!reqStatus || reqStatus.requestStatus === "error") {
            try {
              const httpRes = await makeRequest("GET", `${ENDPOINTS.CHAT.REQUEST_STATUS}/${selectedUser._id}`);
              if (httpRes?.data) {
                reqStatus = httpRes.data;
                statusSource = "HTTP API"; // DEBUG — remove later
              }
            } catch {
              // HTTP also failed
            }
          }

          // 3. Apply result — NO fail-open
          if (reqStatus && reqStatus.requestStatus !== "error") {
            const status = reqStatus.requestStatus || "none";
            setRequestStatus(status);
            if (reqStatus.requestId) setRequestId(reqStatus.requestId);
            if (reqStatus.cooldownRemaining) setCooldownRemaining(reqStatus.cooldownRemaining);
            // DEBUG toast — remove later
            dispatch(showNotification(`[DEBUG] Request status: "${status}" via ${statusSource}`, 200));
            if (status !== "accepted") return;
          } else {
            // Both socket (3 retries) and HTTP failed — show connection error with retry
            setRequestStatus("connection_error");
            // DEBUG toast — remove later
            dispatch(showNotification("[DEBUG] Request status: FAILED (socket + HTTP)", 500));
            return;
          }
        } catch {
          setRequestStatus("connection_error");
          // DEBUG toast — remove later
          dispatch(showNotification("[DEBUG] Request status: EXCEPTION", 500));
          return;
        }
      }

      try {
        const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
        if (chat) {
          setChatId(chat.chatId);
          console.log('Chat history received from server:', chat);
          setMessages((chat.messages || []).map(formatMessage));
          // DEBUG toast — remove later
          dispatch(showNotification(`[DEBUG] Chat history loaded via socket (${(chat.messages || []).length} msgs)`, 200));

          // Mark all messages as read when opening chat
          const result = await chatServiceRef.current.openChat(chat.chatId);
          if (result.success && result.markedCount > 0) {
            console.log(`Marked ${result.markedCount} messages as read`);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.senderId !== currentUserId
                  ? { ...msg, status: MESSAGE_STATUS.SEEN }
                  : msg
              )
            );
          }
        } else {
          // DEBUG toast — remove later
          dispatch(showNotification("[DEBUG] No chat history found (new conversation)", 200));
        }
      } catch {
        setMessages([]);
        // DEBUG toast — remove later
        dispatch(showNotification("[DEBUG] Chat history fetch FAILED", 500));
      }
    };
    fetchChatHistory();
  }, [selectedUser, isSocketReady, currentUserId, isAdmin, reconnectCount]);

  // When socket reconnects (isAuthenticated flips true), bump reconnectCount
  // so fetchChatHistory re-runs with a live socket — picks up correct status + chat history
  const prevAuthRef = useRef(isAuthenticated);
  useEffect(() => {
    if (isAuthenticated && !prevAuthRef.current) {
      // Socket just reconnected and re-authenticated
      console.log('[ChatArea] Socket reconnected — re-fetching chat status & history');
      setReconnectCount(c => c + 1);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // React to real-time request responses via direct callback on chatService
  // This avoids the parent-overwrites-child listener issue
  useEffect(() => {
    if (!chatServiceRef.current || !selectedUser?._id) return;

    const handleResponse = (data) => {
      const responseData = data?.data || data;
      console.log('[ChatArea] chat-request:response callback:', responseData, 'selectedUser:', selectedUser?._id);
      if (
        responseData.status === "accepted" &&
        responseData.acceptedBy === selectedUser?._id
      ) {
        console.log('[ChatArea] Request accepted by selected user, transitioning to accepted');
        setRequestStatus("accepted");
        // Fetch chat history now that the request is accepted
        const loadChat = async () => {
          try {
            if (!chatServiceRef.current || !currentUserId) return;
            const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
            if (chat) {
              setChatId(chat.chatId);
              setMessages((chat.messages || []).map(formatMessage));
            }
          } catch { /* ignore */ }
        };
        loadChat();
      }
    };

    chatServiceRef.current.setChatRequestResponseCallback(handleResponse);

    return () => {
      chatServiceRef.current?.clearChatRequestResponseCallback();
    };
  }, [selectedUser, currentUserId]);

  // Also react to lastRequestResponse prop as a secondary fallback
  useEffect(() => {
    if (!lastRequestResponse) return;
    if (lastRequestResponse.status === "accepted" && lastRequestResponse.acceptedBy === selectedUser?._id) {
      setRequestStatus("accepted");
      const loadChat = async () => {
        try {
          if (!chatServiceRef.current || !currentUserId) return;
          const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
          if (chat) {
            setChatId(chat.chatId);
            setMessages((chat.messages || []).map(formatMessage));
          }
        } catch { /* ignore */ }
      };
      loadChat();
    }
  }, [lastRequestResponse, selectedUser, currentUserId]);

  // Polling fallback: re-check status every 5s while waiting for a response
  // This ensures the sender gets updated even if the real-time event was missed
  useEffect(() => {
    if (requestStatus !== "pending_sent" || !chatServiceRef.current || !selectedUser?._id) return;

    const poll = async () => {
      try {
        const result = await chatServiceRef.current.getChatRequestStatus(selectedUser._id);
        const status = result.requestStatus || "none";
        if (status === "accepted") {
          console.log('[ChatArea] Polling detected accepted status');
          setRequestStatus("accepted");
          if (result.requestId) setRequestId(result.requestId);
          // Load chat history
          const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
          if (chat) {
            setChatId(chat.chatId);
            setMessages((chat.messages || []).map(formatMessage));
          }
        } else if (status === "cooldown" || status === "none") {
          // Request was declined or something changed
          setRequestStatus(status);
          if (result.cooldownRemaining) setCooldownRemaining(result.cooldownRemaining);
        }
      } catch { /* ignore polling errors */ }
    };

    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [requestStatus, selectedUser, currentUserId]);

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
    const isMedia = messageData._uploading && (messageData.type === 'image' || messageData.type === 'video');

    const optimisticMessage = formatMessage({
      id: null,
      chatId,
      type: messageData.type,
      content: messageData.content,
      senderId: currentUserId,
      receiverId: selectedUser._id,
      timestamp: currentTimestamp,
      status: isMedia ? MESSAGE_STATUS.SENDING : MESSAGE_STATUS.PENDING,
      metadata: messageData.metadata,
    });

    // Add optimistic message immediately (with local preview for media)
    setMessages(prev => [...prev, optimisticMessage]);

    if (chatSoundEnabled) {
      playChatSound();
    }

    // Helper to find and update this specific optimistic message
    const updateThis = (updater) => {
      setMessages(prev =>
        prev.map(msg =>
          (msg.timestamp === currentTimestamp && !msg.id && msg.senderId === currentUserId)
            ? updater(msg)
            : msg
        )
      );
    };

    try {
      let finalMessageData = messageData;

      // For media: upload first, then send the real URL
      if (isMedia) {
        try {
          const uploadedFile = await uploadImage({
            file: messageData._file,
            type: 'chat',
            onProgress: () => {},
            metadata: { uploadType: 'cloudinary', folder: 'chat_images' },
          });

          const realUrl = uploadedFile.fileUrl || uploadedFile.url;

          // Update optimistic message with real URL (still pending server ack)
          updateThis(msg => ({
            ...msg,
            content: realUrl,
            status: MESSAGE_STATUS.PENDING,
            metadata: {
              ...msg.metadata,
              fileSize: uploadedFile.metadata?.size || null,
              fileType: uploadedFile.metadata?.type || '',
              width: uploadedFile.metadata?.width || null,
              height: uploadedFile.metadata?.height || null,
              duration: uploadedFile.metadata?.duration || null,
              thumbnailUrl: uploadedFile.thumbnailUrl || '',
            },
          }));

          // Revoke the local blob URL
          if (messageData.content) {
            URL.revokeObjectURL(messageData.content);
          }

          // Build the final payload for the server
          finalMessageData = {
            ...messageData,
            content: realUrl,
            metadata: {
              ...messageData.metadata,
              fileSize: uploadedFile.metadata?.size || null,
              fileType: uploadedFile.metadata?.type || '',
              width: uploadedFile.metadata?.width || null,
              height: uploadedFile.metadata?.height || null,
              duration: uploadedFile.metadata?.duration || null,
              thumbnailUrl: uploadedFile.thumbnailUrl || '',
            },
          };
        } catch (uploadErr) {
          console.error('[ChatArea]: Upload failed:', uploadErr);
          updateThis(msg => ({
            ...msg,
            status: MESSAGE_STATUS.FAILED,
            error: "Upload failed",
          }));
          setError("Failed to upload file");
          return;
        }
      }

      const { messageId, timestamp } = await chatServiceRef.current.sendMessage(
        chatId,
        selectedUser._id,
        finalMessageData
      );

      updateThis(msg => ({
        ...msg,
        chatId,
        id: messageId,
        timestamp,
        status: MESSAGE_STATUS.SENT,
      }));
    } catch (err) {
      updateThis(msg => ({
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

  const handleVideoCall = () => {
    if (!selectedUser?._id) return;
    const userInfo = {
      name: selectedUser?.fullName || selectedUser?.name || selectedUser?.username || "User",
      avatar: selectedUser?.profilePhoto?.url || null,
    };
    if (isExpert) {
      // Expert must request permission first
      requestCallPermission(selectedUser._id, userInfo);
    } else {
      initiateCall(selectedUser._id, userInfo);
    }
  };
  const handleDeleteMessage = (messageId, scope) => {
    // scope: "me" or "everyone", messageId can be single or array
    const ids = Array.isArray(messageId) ? messageId : [messageId];
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
  };

  // Selection mode handlers
  const handleToggleSelect = (messageId) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleExitSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  };

  const handleBulkDeleteForMe = async () => {
    if (!chatServiceRef.current || selectedMessageIds.size === 0) return;
    const ids = [...selectedMessageIds];
    const success = await chatServiceRef.current.deleteMessageForMe(chatId, ids);
    if (success) {
      handleDeleteMessage(ids, "me");
      handleExitSelection();
    }
  };

  const handleBulkDeleteForEveryone = async () => {
    if (!chatServiceRef.current || selectedMessageIds.size === 0) return;
    const ids = [...selectedMessageIds];
    const result = await chatServiceRef.current.deleteMessageForEveryone(chatId, ids);
    if (result.success && result.deletedIds?.length > 0) {
      handleDeleteMessage(result.deletedIds, "everyone");
      handleExitSelection();
    }
  };

  // Check if "Delete for everyone" is allowed for current selection
  const canDeleteForEveryone = () => {
    if (selectedMessageIds.size === 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...selectedMessageIds].every((id) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return false;
      return msg.senderId === currentUserId && new Date(msg.timestamp) >= today;
    });
  };

  const handleMenuClick = () => {};

  // Chat request handlers
  const handleSendRequest = async () => {
    if (!chatServiceRef.current || !selectedUser?._id) return;
    const result = await chatServiceRef.current.sendChatRequest(selectedUser._id);
    if (result.status === "success" || result.status === "already_pending") {
      setRequestStatus("pending_sent");
      if (result.requestId) setRequestId(result.requestId);
    }
    if (result.autoAccepted) {
      setRequestStatus("accepted");
    }
  };

  const handleRespondRequest = async (action) => {
    if (!chatServiceRef.current || !requestId) return;
    const result = await chatServiceRef.current.respondToChatRequest(requestId, action);
    if (result.status === "success") {
      if (action === "accept") {
        setRequestStatus("accepted");
        // Fetch chat history now that request is accepted
        try {
          const chat = await chatServiceRef.current.checkChatHistory(currentUserId, selectedUser._id);
          if (chat) {
            setChatId(chat.chatId);
            setMessages((chat.messages || []).map(formatMessage));
          }
        } catch { /* ignore */ }
      } else {
        setRequestStatus("none");
      }
    }
  };

  // Render the chat request status UI
  const renderRequestStatus = () => {
    if (requestStatus === null) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      );
    }

    if (requestStatus === "connection_error") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
            <Close sx={{ fontSize: 32, color: "#ef4444" }} />
          </div>
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            Unable to connect to the server
          </p>
          <p className="text-xs text-light-text/40 dark:text-dark-text/40">
            {isConnected ? "Server is reachable but the request failed." : "You appear to be offline. Check your connection."}
          </p>
          <button
            onClick={() => setReconnectCount(c => c + 1)}
            className="px-6 py-2.5 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` }}
          >
            Retry
          </button>
        </div>
      );
    }

    if (requestStatus === "none") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.third}33, ${colors.fourth}33)` }}
          >
            <PersonAdd sx={{ fontSize: 32, color: colors.third }} />
          </div>
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            Send a chat request to start a conversation with <span className="font-semibold">{displayName}</span>
          </p>
          <button
            onClick={handleSendRequest}
            className="px-6 py-2.5 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            style={{ background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` }}
          >
            Send Chat Request
          </button>
        </div>
      );
    }

    if (requestStatus === "pending_sent") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.third}33, ${colors.fourth}33)` }}
          >
            <HourglassEmpty sx={{ fontSize: 32, color: colors.third }} />
          </div>
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            Chat request sent to <span className="font-semibold">{displayName}</span>
          </p>
          <p className="text-xs text-light-text/40 dark:text-dark-text/40">
            Waiting for response...
          </p>
          {isExpert && (
            <p className="text-[11px] text-light-text/30 dark:text-dark-text/30 max-w-xs">
              The user needs to accept your request before you can start chatting. The request will auto-expire if not responded to.
            </p>
          )}
        </div>
      );
    }

    if (requestStatus === "pending_received") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.third}33, ${colors.fourth}33)` }}
          >
            <PersonAdd sx={{ fontSize: 32, color: colors.third }} />
          </div>
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            <span className="font-semibold">{displayName}</span> wants to chat with you
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleRespondRequest("accept")}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` }}
            >
              <Check sx={{ fontSize: 18 }} /> Accept
            </button>
            <button
              onClick={() => handleRespondRequest("decline")}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium border border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <Close sx={{ fontSize: 18 }} /> Decline
            </button>
          </div>
        </div>
      );
    }

    if (requestStatus === "cooldown") {
      const formatCooldown = (seconds) => {
        if (seconds >= 86400) {
          const d = Math.ceil(seconds / 86400);
          return `${d} day${d !== 1 ? "s" : ""}`;
        }
        if (seconds >= 3600) {
          const h = Math.ceil(seconds / 3600);
          return `${h} hour${h !== 1 ? "s" : ""}`;
        }
        if (seconds >= 60) {
          const m = Math.ceil(seconds / 60);
          return `${m} minute${m !== 1 ? "s" : ""}`;
        }
        return `${seconds} second${seconds !== 1 ? "s" : ""}`;
      };
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239, 68, 68, 0.1)" }}
          >
            <HourglassEmpty sx={{ fontSize: 32, color: "#ef4444" }} />
          </div>
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            Chat request declined by <span className="font-semibold">{displayName}</span>
          </p>
          <p className="text-xs text-light-text/40 dark:text-dark-text/40">
            You can send a new request in <span className="font-semibold">{formatCooldown(cooldownRemaining)}</span>
          </p>
          <p className="text-[11px] text-light-text/30 dark:text-dark-text/30 max-w-xs">
            A cooldown period applies after a declined request to respect the user's preference.
          </p>
        </div>
      );
    }

    return null;
  };

  const chatHeader = (
    <ChatHeader
      receiverData={{
        _id: selectedUser?._id,
        name: displayName,
        username: selectedUser?.username || '',
        avatar: selectedUser?.profilePhoto?.url || '',
        status: isUserOnline ? 'online' : isUserHidden ? 'hidden' : 'offline',
        lastSeen: selectedUser?.lastSeen || '',
        isExpert: selectedUser?.isExpert || false,
        averageRating: selectedUser?.averageRating,
        totalRatings: selectedUser?.totalRatings,
      }}
      isTyping={isTyping}
      onBack={onBack}
      onVideoCall={requestStatus === "accepted" ? handleVideoCall : undefined}
      onMenuClick={handleMenuClick}
      onSelectMessages={!isSelectionMode ? () => setIsSelectionMode(true) : undefined}
      isExpert={isExpert}
      lastMessage={messages.length > 0 ? messages[messages.length - 1] : null}
      currentUserId={currentUserId}
      chatId={chatId}
      messages={messages}
    />
  );

  // If request is not accepted, show request status UI instead of chat
  if (requestStatus !== "accepted") {
    return (
      <div className='relative h-full w-full flex-1 flex flex-col overflow-hidden bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text'>
        {chatHeader}
        {renderRequestStatus()}
      </div>
    );
  }

  return (
    <div className='relative h-full w-full flex-1 flex flex-col overflow-hidden bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text'>
      {renderError()}
      {chatHeader}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        otherUserName={displayName}
        onMessageSeen={handleMessageSeen}
        chatId={chatId}
        chatServiceRef={chatServiceRef}
        onDeleteMessage={handleDeleteMessage}
        selectionMode={isSelectionMode}
        selectedIds={selectedMessageIds}
        onToggleSelect={handleToggleSelect}
      />
      {isSelectionMode ? (
        <SelectionToolbar
          selectedCount={selectedMessageIds.size}
          canDeleteForEveryone={canDeleteForEveryone()}
          onDeleteForMe={handleBulkDeleteForMe}
          onDeleteForEveryone={handleBulkDeleteForEveryone}
          onCancel={handleExitSelection}
        />
      ) : (
        <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
      )}
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
  isExpert: PropTypes.bool,
  lastRequestResponse: PropTypes.object, // Real-time request response from Chats.jsx listener
};

export default ChatArea;
