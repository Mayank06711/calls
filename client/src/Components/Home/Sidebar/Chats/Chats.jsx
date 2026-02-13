// src/Components/Home/Sidebar/Chats/Chats.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Search, VisibilityOff, Delete, Check, Close, ExpandMore, ExpandLess, Star } from "@mui/icons-material";
import MessageActionMenu from "./MessageActionMenu";
import {
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  CircularProgress,
  Badge,
} from "@mui/material";
import { useSubscriptionColors, selectSubscriptionType, toRgba } from "../../../../utils/getSubscriptionColors";
import ChatArea from "./ChatArea";
import ExpertChatRequest from "./ExpertChatRequest";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import { getAllUsersThunk } from "../../../../redux/thunks/userInfo.thunks";
import {
  ensureSocketAuthenticated,
  isSocketAuthenticated,
} from "../../../../socket/authentication";
import { useSocketContext } from "../../../../socket/SocketContext";
import ChatService from "../../../../socket/chatService";
import { showNotification } from "../../../../redux/actions/notification.actions";
import { makeRequest } from "../../../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../../../constants/apiEndpoints";

function ChatSection() {
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();
  const { socket, isAuthenticated } = useSocketContext(); // Get isAuthenticated directly from context
  const { userId: userIdFromUrl } = useParams();
  const navigate = useNavigate();

  // State management
  const [users, setUsers] = useState([]); // All users from API (for Users/Experts tabs)
  const [chatUsers, setChatUsers] = useState([]); // Users with existing conversations (for Chats tab)
  const [selectedTab, setSelectedTab] = useState("chats"); // Default to "chats" tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  // Add state for socket readiness
  const [isSocketReady, setIsSocketReady] = useState(false);
  // Add state for unread counts
  const [unreadCounts, setUnreadCounts] = useState(new Map());
  // Add state for real-time online status tracking
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [hiddenUsers, setHiddenUsers] = useState(new Set());
  // Chat request state
  const [chatRequests, setChatRequests] = useState([]);
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  // Tracks the latest accepted/declined response (passed to ChatArea for real-time update)
  const [lastRequestResponse, setLastRequestResponse] = useState(null);
  // Track when ChatService is initialized (needed for effect dependencies)
  const [chatServiceReady, setChatServiceReady] = useState(false);
  // Expert chat request popup state
  const [expertChatRequest, setExpertChatRequest] = useState(null);

  // Refs
  const observerRef = useRef();
  const chatServiceRef = useRef(null);
  const processedDeliveredAcks = useRef(new Set()); // Deduplication for delivered-ack

  // Initialize ChatService when socket is available
  useEffect(() => {
    if (socket && !chatServiceRef.current) {
      chatServiceRef.current = new ChatService(socket);
      setChatServiceReady(true); // Trigger dependent effects
      console.log('✅ ChatService initialized');
    }
  }, [socket]);

  // Listen for user:online and user:offline events to track real-time status in chat list
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data) => {
      console.log('🟢 [ChatList] User came ONLINE:', data.userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(data.userId);
        return newSet;
      });
    };

    const handleUserOffline = (data) => {
      console.log('🔴 [ChatList] User went OFFLINE:', data.userId);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    const handleUserHidden = (data) => {
      console.log('🟡 [ChatList] User is HIDDEN:', data.userId || data.data?.userId);
      const userId = data.userId || data.data?.userId;
      if (!userId) return;
      setHiddenUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
      // Remove from online set since they appear as hidden
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    const handleUserUnhidden = (data) => {
      console.log('🟢 [ChatList] User UNHIDDEN:', data.userId || data.data?.userId);
      const userId = data.userId || data.data?.userId;
      if (!userId) return;
      setHiddenUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    socket.on('user:hidden', handleUserHidden);
    socket.on('user:unhidden', handleUserUnhidden);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user:hidden', handleUserHidden);
      socket.off('user:unhidden', handleUserUnhidden);
    };
  }, [socket]);

  // Fetch initial online users when socket is ready
  useEffect(() => {
    if (!isSocketReady || !chatServiceReady || !chatServiceRef.current) return;

    const fetchOnlineUsers = async () => {
      try {
        const result = await chatServiceRef.current.getOnlineUsers();
        const { onlineUserIds, hiddenUserIds } = result;
        console.log('🟢 [ChatList] Initial online users:', onlineUserIds, 'hidden:', hiddenUserIds);
        setOnlineUsers(new Set(onlineUserIds));
        setHiddenUsers(new Set(hiddenUserIds));
      } catch (error) {
        console.error('Failed to fetch initial online users:', error);
      }
    };

    fetchOnlineUsers();
  }, [isSocketReady, chatServiceReady]);

  // Selectors
  const loadingInitial = useSelector(
    (state) => state.loaderState.loaders[LOADER_TYPES.GET_ALL_USERS]
  );
  const loadingMore = useSelector(
    (state) => state.loaderState.loaders[LOADER_TYPES.GET_MORE_USERS]
  );

  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const subscriptionType = useSelector(selectSubscriptionType);
  const isPremium = ["GOLD", "SILVER", "PLATINUM"].includes(subscriptionType?.toUpperCase());
  // Add socket status selectors
  const socketStatus = useSelector((state) => state.socketMetrics);
  const { connected, authenticated } = socketStatus;

  // Derive socket readiness directly from Redux state (no async calls here)
  // SocketContext is the single owner of authentication — this just reacts to state
  useEffect(() => {
    setIsSocketReady(connected && authenticated);
  }, [connected, authenticated]);

  // Fetch chat list with unread counts when socket is ready
  // ⚠️ CRITICAL: Use isAuthenticated from SocketContext (source of truth) + chatServiceReady state
  useEffect(() => {
    if (!isSocketReady || !isAuthenticated || !chatServiceReady || !chatServiceRef.current) return;
    
    console.log('📋 Fetching chat list - all conditions met:', { isSocketReady, isAuthenticated, chatServiceReady });

    const fetchChatList = async () => {
      try {
        const result = await chatServiceRef.current.getChatList();
        console.log('📋 Chat list result:', result);
        
        if (result.chats && result.chats.length > 0) {
          const countsMap = new Map();
          
          // Get current open chat ID (convert to string for comparison)
          const currentOpenChatUserId = userIdFromUrl?.toString() || selectedUser?._id?.toString();
          
          // Build chatUsers list from chat participants
          const chatUsersList = result.chats
            .filter(chat => chat.otherUser && chat.otherUser._id)
            .map(chat => {
              const chatUserId = chat.otherUser._id?.toString();
              const isCurrentlyOpenChat = chatUserId === currentOpenChatUserId;
              
              console.log('🔍 Chat unread check:', { 
                chatUserId, 
                currentOpenChatUserId, 
                isCurrentlyOpenChat, 
                unreadCount: chat.unreadCount 
              });
              
              // Don't set unread count for currently open chat
              if (chat.unreadCount > 0 && !isCurrentlyOpenChat) {
                countsMap.set(chatUserId, chat.unreadCount);
              }
              
              // Return user object with additional chat metadata
              return {
                ...chat.otherUser,
                _id: chatUserId,
                chatId: chat.chatId,
                lastMessageTime: chat.updatedAt,
                lastMessage: chat.lastMessage,
              };
            })
            // Sort by last message time (most recent first)
            .sort((a, b) => {
              const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
              const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
              return timeB - timeA;
            });
          
          console.log('👥 Chat users (conversations):', chatUsersList);
          setChatUsers(chatUsersList);
          setUnreadCounts(countsMap);
          console.log('📊 Final unread counts:', countsMap, '(excluded open chat:', currentOpenChatUserId, ')');
        }
      } catch (error) {
        console.error('Failed to fetch chat list:', error);
      }
    };

    fetchChatList();
  }, [isSocketReady, isAuthenticated, chatServiceReady]); // ⚠️ isAuthenticated from context is source of truth

  // Fetch pending chat requests and set up listeners
  useEffect(() => {
    if (!isSocketReady || !isAuthenticated || !chatServiceReady || !chatServiceRef.current) return;

    const fetchRequests = async () => {
      try {
        const requests = await chatServiceRef.current.getChatRequests("received");
        setChatRequests(requests);
      } catch (error) {
        console.error("Failed to fetch chat requests:", error);
      }
    };
    fetchRequests();

    // Listen for incoming chat requests
    chatServiceRef.current.addChatRequestReceivedListener((data) => {
      const requestData = data.data || data;
      if (requestData.request) {
        // If this is from an expert, show the popup instead of just a notification
        if (requestData.fromExpert || requestData.request.sender?.isExpert) {
          setExpertChatRequest(requestData.request);
        } else {
          setChatRequests((prev) => [requestData.request, ...prev]);
        }
        const senderName = requestData.request.sender?.fullName || "Someone";
        dispatch(showNotification(`${senderName} wants to chat with you`, 200, {
          type: 'chat_request',
          requestId: requestData.request._id,
          sender: requestData.request.sender,
          playSound: true,
        }));
      }
    });

    // Listen for request responses (other user accepted/declined our request)
    chatServiceRef.current.addChatRequestResponseListener((data) => {
      const responseData = data.data || data;
      if (responseData.status === "accepted") {
        dispatch(showNotification("Chat request accepted!", 200, { playSound: true }));
      }
      // Pass response to ChatArea via state (since this listener overwrites ChatArea's)
      setLastRequestResponse(responseData);
    });
  }, [isSocketReady, isAuthenticated, chatServiceReady]);

  // Chat request accept/decline handlers
  const handleAcceptRequest = async (requestId) => {
    if (!chatServiceRef.current) {
      console.error('❌ [ChatRequest] chatServiceRef.current is null, cannot accept');
      dispatch(showNotification('Chat service not ready, please try again', 400));
      return;
    }
    // Save sender info BEFORE removing the request from state
    const acceptedRequest = chatRequests.find((r) => r._id === requestId);
    const senderUser = acceptedRequest?.sender;

    console.log('✅ [ChatRequest] Accepting request:', requestId);
    const result = await chatServiceRef.current.respondToChatRequest(requestId, "accept");
    console.log('✅ [ChatRequest] Accept result:', result);
    if (result.status === "success") {
      setChatRequests((prev) => prev.filter((r) => r._id !== requestId));
      dispatch(showNotification('Chat request accepted!', 200));
      // Refresh chat list to include the new chat
      const chatResult = await chatServiceRef.current.getChatList();
      if (chatResult.chats) {
        const chatUsersList = chatResult.chats
          .filter(chat => chat.otherUser && chat.otherUser._id)
          .map(chat => ({
            ...chat.otherUser,
            _id: chat.otherUser._id?.toString(),
            chatId: chat.chatId,
            lastMessageTime: chat.updatedAt,
            lastMessage: chat.lastMessage,
          }))
          .sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
          });
        setChatUsers(chatUsersList);
      }
      // Auto-open chat with the sender after accepting
      if (senderUser?._id) {
        handleUserSelect(senderUser);
      }
    } else {
      console.error('❌ [ChatRequest] Accept failed:', result);
      dispatch(showNotification(result.message || 'Failed to accept request', 400));
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!chatServiceRef.current) {
      console.error('❌ [ChatRequest] chatServiceRef.current is null, cannot decline');
      dispatch(showNotification('Chat service not ready, please try again', 400));
      return;
    }
    console.log('🚫 [ChatRequest] Declining request:', requestId);
    const result = await chatServiceRef.current.respondToChatRequest(requestId, "decline");
    console.log('🚫 [ChatRequest] Decline result:', result);
    if (result.status === "success") {
      setChatRequests((prev) => prev.filter((r) => r._id !== requestId));
      dispatch(showNotification('Chat request declined', 200));
    } else {
      console.error('❌ [ChatRequest] Decline failed:', result);
      dispatch(showNotification(result.message || 'Failed to decline request', 400));
    }
  };

  // Expert chat request popup handlers
  const handleAcceptExpertChatRequest = async (requestId) => {
    if (!chatServiceRef.current) return;
    const result = await chatServiceRef.current.respondToChatRequest(requestId, "accept");
    if (result.status === "success") {
      const senderUser = expertChatRequest?.sender;
      setExpertChatRequest(null);
      dispatch(showNotification('Chat request accepted!', 200));
      // Refresh chat list
      const chatResult = await chatServiceRef.current.getChatList();
      if (chatResult.chats) {
        const chatUsersList = chatResult.chats
          .filter(chat => chat.otherUser && chat.otherUser._id)
          .map(chat => ({
            ...chat.otherUser,
            _id: chat.otherUser._id?.toString(),
            chatId: chat.chatId,
            lastMessageTime: chat.updatedAt,
            lastMessage: chat.lastMessage,
          }))
          .sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
            return timeB - timeA;
          });
        setChatUsers(chatUsersList);
      }
      if (senderUser?._id) handleUserSelect(senderUser);
    } else {
      dispatch(showNotification(result.message || 'Failed to accept request', 400));
    }
  };

  const handleDeclineExpertChatRequest = async (requestId) => {
    if (!chatServiceRef.current) return;
    const result = await chatServiceRef.current.respondToChatRequest(requestId, "decline");
    setExpertChatRequest(null);
    if (result.status === "success") {
      dispatch(showNotification('Chat request declined', 200));
    }
  };

  // GLOBAL message listener: Sends delivered-ack for ALL messages + updates unread counts
  useEffect(() => {
    if (!isSocketReady || !chatServiceRef.current) return;

    const handleNewMessage = (message) => {
      const msgData = message.data || message;
      const senderId = msgData.senderId;
      const messageId = msgData.messageId || msgData.id;
      const chatId = msgData.chatId;
      const isHistoryLoad = msgData.isHistoryLoad || message.isHistoryLoad;
      
      console.log('🌍 GLOBAL message listener received:', {
        messageId,
        senderId,
        chatId,
        isHistoryLoad,
        selectedUserId: selectedUser?._id,
        isFromSelectedUser: senderId === selectedUser?._id
      });

      // ⚠️ CRITICAL FIX: ONLY send delivered-ack for NEW real-time messages FROM OTHER USERS
      // DO NOT send for:
      // 1. History messages (old messages)
      // 2. Messages sent by CURRENT USER (don't mark own messages as delivered!)
      // 3. Messages already processed (deduplication)
      const currentUserId = localStorage.getItem('userId');
      const isOwnMessage = senderId === currentUserId;
      const ackKey = `${chatId}-${messageId}`;
      const alreadyProcessed = processedDeliveredAcks.current.has(ackKey);
      
      if (!isHistoryLoad && !isOwnMessage && !alreadyProcessed && messageId && chatId && chatServiceRef.current) {
        // Mark as processed BEFORE sending to prevent duplicates
        processedDeliveredAcks.current.add(ackKey);
        
        // Clean up old entries after 1 minute to prevent memory leak
        setTimeout(() => processedDeliveredAcks.current.delete(ackKey), 60000);
        
        console.log('📬 Sending delivered-ack for NEW message from OTHER user:', { chatId, messageId, senderId });
        chatServiceRef.current.markMessageAsDelivered(chatId, messageId)
          .catch(err => console.error('❌ Failed to send delivered-ack:', err));
      } else if (isHistoryLoad) {
        console.log('⏭️ Skipping delivered-ack for history message:', messageId);
      } else if (isOwnMessage) {
        console.log('🚫 Skipping delivered-ack for OWN message (sender should not mark as delivered):', messageId);
      } else if (alreadyProcessed) {
        console.log('⏭️ Skipping duplicate delivered-ack (already processed):', messageId);
      }
      
      // Only increment unread if message is from someone else and not currently viewing that chat
      // Check BOTH userIdFromUrl AND selectedUser._id to handle all cases
      const isCurrentlyViewingThisChat = 
        senderId === userIdFromUrl || 
        senderId === selectedUser?._id;
      
      console.log('🔍 Toast check:', { senderId, userIdFromUrl, selectedUserId: selectedUser?._id, isCurrentlyViewingThisChat });
      
      // ⚠️ CRITICAL: Skip ALL processing for own messages - no unread, no toast
      if (isOwnMessage) {
        console.log('🚫 Skipping unread/toast for OWN message');
        return; // Exit early - don't process own messages further
      }
      
      // If chat IS open, ChatArea's onMessageReceived will handle seen-ack
      if (senderId && !isCurrentlyViewingThisChat && !isHistoryLoad) {
        console.log('📊 Incrementing unread count for user:', senderId, '(not viewing this chat)');
        setUnreadCounts(prev => {
          const newCounts = new Map(prev);
          const currentCount = newCounts.get(senderId) || 0;
          newCounts.set(senderId, currentCount + 1);
          return newCounts;
        });
        
        // 🔔 Show Toast notification for new message in CLOSED chat
        // Search in BOTH users and chatUsers to find sender name
        const senderUser = users.find(u => u._id === senderId) || chatUsers.find(u => u._id === senderId);
        const senderName = senderUser?.fullName || senderUser?.username || msgData.senderName || 'Someone';
        const messagePreview = msgData.text || msgData.content || 'New message';
        const preview = messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview;
        
        console.log('🔔 Showing toast notification:', { senderName, senderId, preview, currentChat: userIdFromUrl });
        dispatch(showNotification(
          `${senderName}: ${preview}`, 
          200,
          { type: 'chat_message', userId: senderId, playSound: true }
        ));
      } else if (isCurrentlyViewingThisChat) {
        console.log('✅ Message from currently open chat - no toast, no unread increment');
      } else if (isHistoryLoad) {
        console.log('⏭️ Skipping unread/toast for history message');
      }
      
      // 🟢 Mark user as online when they send a message (real-time activity indicator)
      if (!isHistoryLoad && senderId) {
        console.log('🟢 Marking user as online:', senderId);
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.add(senderId);
          return newSet;
        });
        
        // Remove from online set after 5 minutes of inactivity
        setTimeout(() => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(senderId);
            return newSet;
          });
        }, 5 * 60 * 1000); // 5 minutes
      }
      
      // ALWAYS move the chat partner to top when ANY message is exchanged
      // For incoming messages: move sender to top
      // For outgoing messages: receiverId would be in msgData, move that user to top
      const userIdToMove = senderId;
      if (userIdToMove) {
        console.log('📌 Attempting to move user to top in chatUsers:', userIdToMove);
        
        // Move in chatUsers list (for Chats tab)
        setChatUsers(prevChatUsers => {
          const userIndex = prevChatUsers.findIndex(u => u._id === userIdToMove);
          console.log('Current position in chatUsers:', userIndex, 'Total:', prevChatUsers.length);
          
          if (userIndex > 0) {
            console.log('✅ Moving user from position', userIndex, 'to top in chatUsers');
            const newChatUsers = [...prevChatUsers];
            const [user] = newChatUsers.splice(userIndex, 1);
            user.lastMessageTime = new Date().toISOString(); // Update last message time
            newChatUsers.unshift(user);
            return newChatUsers;
          } else if (userIndex === 0) {
            console.log('ℹ️ User already at top of chatUsers');
          } else {
            // User not in chatUsers - this is a NEW conversation!
            // Find user in users list or create minimal entry
            console.log('⚠️ User not in chatUsers - creating new chat entry');
            const userFromList = users.find(u => u._id === userIdToMove);
            if (userFromList) {
              return [{ ...userFromList, lastMessageTime: new Date().toISOString() }, ...prevChatUsers];
            }
          }
          return prevChatUsers;
        });
        
        // Also update users list for Users/Experts tabs
        setUsers(prevUsers => {
          const userIndex = prevUsers.findIndex(u => u._id === userIdToMove);
          if (userIndex > 0) {
            const newUsers = [...prevUsers];
            const [user] = newUsers.splice(userIndex, 1);
            newUsers.unshift(user);
            return newUsers;
          }
          return prevUsers;
        });
      }
    };

    chatServiceRef.current.addMessageListener(handleNewMessage);

    return () => {
      // ⚠️ CRITICAL: Remove the listener when dependencies change to prevent duplicates
      if (chatServiceRef.current) {
        chatServiceRef.current.removeMessageListener(); // No argument - removes stored callback
      }
    };
  }, [isSocketReady, selectedUser, users]);

  // api calling no relationship with socket - ONLY for Users/Experts tabs
  const fetchUsers = async (pageNum = 1, isLoadMore = false) => {
    // Skip API call for "chats" tab - it uses chatUsers from socket
    if (selectedTab === "chats") return;
    
    if (!hasMore && isLoadMore) return;

    const result = await dispatch(
      getAllUsersThunk({
        page: pageNum,
        limit: 20,
        userType:
          selectedTab === "experts"
            ? "expert"
            : "user",
        search: searchQuery,
      })
    );

    if (result.success) {
      setUsers((prev) =>
        isLoadMore ? [...prev, ...result.data] : result.data
      );
      setHasMore(!result.pagination.isLastPage);
      setPage(pageNum);
    }
  };

  // Define a memoized function to handle the last user element reference
  const lastUserElementRef = useCallback(
    (node) => {
      // Check if loading more users or if there are no more users to load
      if (loadingMore || !hasMore) return;
      // Disconnect the current observer if it exists
      if (observerRef.current) observerRef.current.disconnect();

      // Create a new IntersectionObserver to monitor the last user element
      observerRef.current = new IntersectionObserver((entries) => {
        // If the last user element is visible and there are more users to load
        if (entries[0].isIntersecting && hasMore) {
          // Fetch the next page of users
          fetchUsers(page + 1, true);
        }
      });

      // If a node is provided, start observing it
      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore, page] // Dependencies for the memoization
  );

  // Reset and fetch when filters change - ONLY for Users/Experts tabs
  useEffect(() => {
    // Skip fetch for "chats" tab - it uses socket-based chatUsers
    if (selectedTab === "chats") return;
    
    setPage(1);
    setHasMore(true);
    fetchUsers(1, false);
  }, [selectedTab, searchQuery]);

  // Handle URL parameter - auto-select user if userId in URL
  // This runs as a separate effect that IMMEDIATELY tries to fetch the user if not found
  useEffect(() => {
    // Skip if no userId in URL or already selected
    if (!userIdFromUrl || selectedUser?._id === userIdFromUrl) {
      return;
    }

    // Check if user is already in the loaded list
    const userInList = users.find(u => u._id === userIdFromUrl);
    
    if (userInList) {
      console.log('📍 Auto-selecting user from URL (found in list):', userIdFromUrl);
      handleUserSelect(userInList);
      return;
    }

    // User NOT in list - we need to fetch them by ID
    // Don't wait for users to load - fetch immediately
    const fetchUserById = async () => {
      console.log('📍 User not in list, fetching from API:', userIdFromUrl);
      try {
        const { data, error } = await makeRequest(
          HTTP_METHODS.POST,
          ENDPOINTS.USERS.GET_USER_BY_ID,
          { id: userIdFromUrl }
        );
        
        if (!error && data?.success && data?.data) {
          const fetchedUser = data.data;
          console.log('✅ Fetched user from API:', fetchedUser);
          
          // Add to users list (at top since we're opening their chat)
          setUsers(prev => {
            // Check if already exists (race condition prevention)
            if (prev.some(u => u._id === fetchedUser._id)) {
              return prev;
            }
            return [fetchedUser, ...prev];
          });
          
          // Select the user directly
          setSelectedUser(fetchedUser);
          
          // Clear any unread count for this user
          setUnreadCounts(prev => {
            const newCounts = new Map(prev);
            newCounts.delete(fetchedUser._id);
            return newCounts;
          });
        } else {
          console.error('❌ Failed to fetch user:', error || 'User not found');
        }
      } catch (err) {
        console.error('❌ Error fetching user by ID:', err);
      }
    };

    // Only fetch if we have a valid userIdFromUrl and user isn't in list
    if (userIdFromUrl && !userInList) {
      fetchUserById();
    }
  }, [userIdFromUrl, users.length, selectedUser?._id]); // Note: users.length instead of users to prevent infinite loop

  useEffect(() => {
    console.log("test socket authentication", isSocketAuthenticated());
  }, [isSocketAuthenticated()]);

  // Listen for Accept/Decline actions from Toast notification buttons
  useEffect(() => {
    const onAcceptFromToast = (e) => {
      const { requestId, sender } = e.detail || {};
      if (requestId) {
        handleAcceptRequest(requestId);
      }
    };
    const onDeclineFromToast = (e) => {
      const { requestId } = e.detail || {};
      if (requestId) {
        handleDeclineRequest(requestId);
      }
    };

    window.addEventListener('chat-request:accept-from-toast', onAcceptFromToast);
    window.addEventListener('chat-request:decline-from-toast', onDeclineFromToast);

    return () => {
      window.removeEventListener('chat-request:accept-from-toast', onAcceptFromToast);
      window.removeEventListener('chat-request:decline-from-toast', onDeclineFromToast);
    };
  }, [chatRequests]); // re-bind when chatRequests change so handlers have fresh state

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Modify handleUserSelect to check socket status and update URL
  const handleUserSelect = async (user) => {
    try {
      if (!isSocketAuthenticated()) {
        await ensureSocketAuthenticated();
      }
      setSelectedUser(user);
      
      // Navigate to /chats/:userId for deep linking
      navigate(`/chats/${user._id}`, { replace: true });
      
      // Clear unread count for this user
      setUnreadCounts(prev => {
        const newCounts = new Map(prev);
        newCounts.delete(user._id);
        return newCounts;
      });
      
      // If selected from Users/Experts tab, add to chatUsers if not already there
      // This ensures user appears in Chats tab after first interaction
      if (selectedTab !== "chats") {
        setChatUsers(prev => {
          // Check if user already exists in chatUsers
          if (prev.some(u => u._id === user._id)) {
            return prev;
          }
          // Add user to top of chatUsers
          return [{ ...user, lastMessageTime: new Date().toISOString() }, ...prev];
        });
      }
    } catch (error) {
      console.error("Socket authentication failed when selecting user:", error);
    }
  };

  // Chat hide/delete handlers
  const handleHideChat = async (chatId, userId) => {
    if (!chatServiceRef.current) return;
    const success = await chatServiceRef.current.hideChat(chatId);
    if (success) {
      setChatUsers((prev) => prev.filter((u) => u._id !== userId));
    } else {
      dispatch(showNotification("Failed to hide chat", "error"));
    }
  };

  const handleDeleteChat = async (chatId, userId) => {
    if (!chatServiceRef.current) return;
    const success = await chatServiceRef.current.deleteChat(chatId);
    if (success) {
      setChatUsers((prev) => prev.filter((u) => u._id !== userId));
      if (selectedUser?._id === userId) {
        setSelectedUser(null);
        navigate("/chats", { replace: true });
      }
    } else {
      dispatch(showNotification("Failed to delete chat", "error"));
    }
  };

  // Handle back button (mobile) - deselect user and go back to list
  const handleBackToList = () => {
    setSelectedUser(null);
    navigate('/chats', { replace: true });
  };

  // Add socket status indicator in the UI, page ke uper wala
  const renderSocketStatus = () => {
    if (!connected) {
      return (
        <div className='text-red-500 text-xs p-2 bg-red-100 rounded'>
          Socket disconnected. Trying to reconnect...
        </div>
      );
    }
    if (!authenticated) {
      return (
        <div className='text-yellow-500 text-xs p-2 bg-yellow-100 rounded'>
          Authenticating socket connection...
        </div>
      );
    }
    return null;
  };

  // console.log("users", users);
  return (
    <div className='flex h-full w-full bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text overflow-hidden'>
      {/* Expert chat request popup */}
      {expertChatRequest && (
        <ExpertChatRequest
          expertInfo={expertChatRequest.sender || expertChatRequest}
          requestId={expertChatRequest._id}
          onAccept={handleAcceptExpertChatRequest}
          onDecline={handleDeclineExpertChatRequest}
        />
      )}
      {/* Sidebar - hidden on mobile when chat is selected */}
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex w-full'} md:w-96 md:min-w-96 flex-col h-full overflow-hidden border-r border-light-primary dark:border-dark-primary bg-light-secondary dark:bg-dark-secondary`}>
        {/* Add socket status indicator */}
        {renderSocketStatus()}
        {/* Search Bar */}
        <div className='p-2 border-b border-light-secondary dark:border-dark-secondary'>
          <div className='flex items-center bg-light-primary dark:bg-dark-primary rounded-full px-3 py-1'>
            <IconButton size='small'>
              <Search className='text-light-text dark:text-dark-text opacity-50' />
            </IconButton>
            <input
              type='text'
              placeholder='Search by name or username...'
              className='ml-1 bg-transparent border-none outline-none w-full'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className='border-b border-light-secondary/10'>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            variant='fullWidth'
            sx={{
              minHeight: "32px",
              "& .MuiTab-root": {
                color: "inherit",
                opacity: 0.7,
                minHeight: "30px",
                padding: "4px 12px",
                fontSize: "0.875rem",
                textTransform: "none",
                "&.Mui-selected": {
                  color: colors.fourth,
                  opacity: 1,
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: colors.fourth,
                height: "2px",
              },
            }}
          >
            <Tab label='Chats' value='chats' disableRipple />
            <Tab label='Users' value='users' disableRipple />
            <Tab label='Experts' value='experts' disableRipple />
          </Tabs>
        </div>

        {/* Users List - Show chatUsers for "chats" tab, users for other tabs */}
        <div className='overflow-y-auto h-[calc(100vh-160px)] p-2 scrollbar-hide'>
          {loadingInitial && selectedTab !== "chats" && isSocketReady ? (
            <div className='flex justify-center p-4'>
              <CircularProgress size={24} />
            </div>
          ) : (
            <>
              {/* Pending Chat Requests Section — only visible on Chats tab */}
              {selectedTab === "chats" && chatRequests.length > 0 && (
                <div className="mb-2">
                  <button
                    onClick={() => setRequestsExpanded((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-light-text/50 dark:text-dark-text/50 hover:bg-light-accent/5 rounded-lg transition-colors"
                  >
                    <span>Chat Requests ({chatRequests.length})</span>
                    {requestsExpanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />}
                  </button>
                  {requestsExpanded && chatRequests.map((req) => {
                    const sender = req.sender || {};
                    return (
                      <div
                        key={req._id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-light-accent/5 transition-colors"
                      >
                        <Avatar
                          src={sender.profilePhoto?.url}
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: colors.third,
                            border: `2px solid ${colors.fourth}`,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-light-text dark:text-dark-text">
                            {sender.fullName || sender.username || "User"}
                          </p>
                          <p className="text-xs text-light-text/40 dark:text-dark-text/40">
                            Wants to chat
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleAcceptRequest(req._id); }}
                            sx={{ color: colors.third, "&:hover": { bgcolor: toRgba(colors.third, 0.22) } }}
                          >
                            <Check sx={{ fontSize: 18 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); handleDeclineRequest(req._id); }}
                            sx={{ color: "#ef4444", "&:hover": { bgcolor: "#ef444422" } }}
                          >
                            <Close sx={{ fontSize: 18 }} />
                          </IconButton>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-px bg-light-text/10 dark:bg-dark-text/10 mx-3 mt-1" />
                </div>
              )}

              {/* Render chatUsers for "chats" tab, users for other tabs */}
              {/* Filter chatUsers by search query when in chats tab */}
              {(selectedTab === "chats"
                ? chatUsers.filter(user =>
                    !searchQuery || 
                    user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : users
              ).map((user, index) => (
                <div
                  key={user._id}
                  ref={selectedTab !== "chats" && index === users.length - 1 ? lastUserElementRef : null}
                  className={`group flex items-center p-2 cursor-pointer hover:bg-light-accent/5 ${
                    selectedUser?._id === user._id ? "bg-light-accent/10" : ""
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  <Badge
                    badgeContent={unreadCounts.get(user._id) || 0}
                    max={99}
                    onClick={(e) => {
                      // Only badge itself is clickable, not the avatar
                      if (unreadCounts.get(user._id) > 0) {
                        e.stopPropagation();
                        handleUserSelect(user);
                      }
                    }}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        height: '18px',
                        minWidth: '18px',
                        padding: '0 4px',
                        backgroundColor: colors.fourth, // Subscription color
                        color: '#fff',
                        cursor: unreadCounts.get(user._id) > 0 ? 'pointer' : 'default',
                        '&:hover': {
                          backgroundColor: colors.third, // Hover with darker subscription color
                        }
                      }
                    }}
                  >
                    <Avatar
                      src={user.profilePhoto?.url}
                      sx={{
                        bgcolor: colors.third,
                        width: 32,
                        height: 32,
                        fontSize: "0.875rem",
                      }}
                    >
                      {user.fullName[0]}
                    </Avatar>
                  </Badge>
                  <div className='ml-2 flex-1'>
                    <div className='flex items-center justify-between'>
                      <p className='font-medium text-sm'>{user.fullName}</p>
                      <div className="flex items-center gap-1">
                        {user.isExpert && user.averageRating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs" style={{ color: '#f59e0b' }}>
                            <Star sx={{ fontSize: 12 }} />
                            <span>{user.averageRating?.toFixed(1)}</span>
                            <span className="text-light-text/40 dark:text-dark-text/40">({user.totalRatings})</span>
                          </span>
                        )}
                        <Chip
                          label={user.isExpert ? "Expert" : "User"}
                          size='small'
                          sx={{
                            backgroundColor: colors.second,
                            color: "white",
                            fontSize: "0.65rem",
                            height: "18px",
                          }}
                        />
                      </div>
                    </div>
                    <div className='flex items-center text-xs opacity-70'>
                      <span>@{user.username}</span>
                      <span
                        className={`ml-2 w-2 h-2 rounded-full ${
                          onlineUsers.has(user._id) ? "bg-green-500" : hiddenUsers.has(user._id) ? "bg-yellow-500" : "bg-gray-400"
                        }`}
                        title={onlineUsers.has(user._id) ? "Online" : hiddenUsers.has(user._id) ? "Away" : "Offline"}
                      />
                    </div>
                  </div>

                  {/* Chat actions menu (only in Chats tab) */}
                  {selectedTab === "chats" && user.chatId && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <MessageActionMenu
                        items={[
                          {
                            label: "Hide",
                            icon: <VisibilityOff sx={{ fontSize: 16 }} />,
                            onClick: () => handleHideChat(user.chatId, user._id),
                            show: isPremium && !isExpert,
                          },
                          {
                            label: "Delete",
                            icon: <Delete sx={{ fontSize: 16 }} />,
                            onClick: () => handleDeleteChat(user.chatId, user._id),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              ))}

              {loadingMore && selectedTab !== "chats" && (
                <div className='flex justify-center p-4'>
                  <CircularProgress size={24} />
                </div>
              )}

              {selectedTab !== "chats" && !hasMore && users.length > 0 && (
                <div className='text-center text-gray-500 p-4'>
                  No more users to load
                </div>
              )}

              {/* Skeleton loading for Users/Experts tabs when socket is not ready */}
              {selectedTab !== "chats" && !isSocketReady && users.length === 0 && (
                <div className="space-y-1 p-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center p-2 gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-light-text/10 dark:bg-dark-text/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-3/4" />
                        <div className="h-2 rounded bg-light-text/5 dark:bg-dark-text/5 w-1/2" />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-center text-light-text/40 dark:text-dark-text/40 mt-3">
                    Connecting to server...
                  </p>
                </div>
              )}

              {/* Empty state for Users/Experts tabs (only when socket IS ready) */}
              {selectedTab !== "chats" && isSocketReady && !loadingInitial && users.length === 0 && (
                <div className='text-center text-gray-500 p-4'>
                  No users found
                </div>
              )}

              {/* Skeleton loading for Chats tab when socket is not ready */}
              {selectedTab === "chats" && !isSocketReady && chatUsers.length === 0 && (
                <div className="space-y-1 p-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center p-2 gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-light-text/10 dark:bg-dark-text/10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-3/4" />
                        <div className="h-2 rounded bg-light-text/5 dark:bg-dark-text/5 w-1/2" />
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-center text-light-text/40 dark:text-dark-text/40 mt-3">
                    Connecting to server...
                  </p>
                </div>
              )}

              {/* Empty state for Chats tab (only when socket IS ready but no chats) */}
              {selectedTab === "chats" && isSocketReady && chatUsers.length === 0 && (
                <div className='text-center text-gray-500 p-4 flex flex-col items-center gap-2'>
                  <p>No conversations yet</p>
                  <p className='text-sm'>Start chatting by selecting a user from the Users or Experts tab</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area - full width on mobile, hidden when no user selected on mobile */}
      {selectedUser && isSocketReady ? (
        <div className='flex-1 h-full overflow-hidden'>
          <ChatArea
            selectedUser={selectedUser}
            chatServiceRef={chatServiceRef}
            onBack={handleBackToList}
            isExpert={isExpert}
            lastRequestResponse={lastRequestResponse}
          />
        </div>
      ) : (
        <div className='hidden md:flex flex-1 h-full items-center justify-center'>
          {!isSocketReady ? (
            <div className="flex flex-col w-full h-full">
              {/* Chat header skeleton */}
              <div className="flex items-center gap-3 p-4 border-b border-light-text/10 dark:border-dark-text/10 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-light-text/10 dark:bg-dark-text/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded bg-light-text/10 dark:bg-dark-text/10 w-32" />
                  <div className="h-2.5 rounded bg-light-text/5 dark:bg-dark-text/5 w-16" />
                </div>
              </div>
              {/* Message bubbles skeleton */}
              <div className="flex-1 p-4 space-y-4 overflow-hidden animate-pulse">
                {/* Received message */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-light-text/8 dark:bg-dark-text/8 p-3 max-w-[60%] space-y-2">
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-48" />
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-36" />
                  </div>
                </div>
                {/* Sent message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-light-text/6 dark:bg-dark-text/6 p-3 max-w-[60%] space-y-2">
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-40" />
                  </div>
                </div>
                {/* Received message */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-light-text/8 dark:bg-dark-text/8 p-3 max-w-[60%] space-y-2">
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-52" />
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-28" />
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-44" />
                  </div>
                </div>
                {/* Sent message */}
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-light-text/6 dark:bg-dark-text/6 p-3 max-w-[60%] space-y-2">
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-56" />
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-32" />
                  </div>
                </div>
                {/* Received message */}
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-light-text/8 dark:bg-dark-text/8 p-3 max-w-[60%]">
                    <div className="h-3 rounded bg-light-text/10 dark:bg-dark-text/10 w-36" />
                  </div>
                </div>
              </div>
              {/* Input bar skeleton */}
              <div className="p-4 border-t border-light-text/10 dark:border-dark-text/10 animate-pulse">
                <div className="h-10 rounded-full bg-light-text/8 dark:bg-dark-text/8" />
              </div>
              <p className="text-xs text-center text-light-text/40 dark:text-dark-text/40 pb-3">
                Connecting to server...
              </p>
            </div>
          ) : (
            <p className='text-light-text/50 dark:text-dark-text/50'>
              Select a chat to start messaging
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatSection;
