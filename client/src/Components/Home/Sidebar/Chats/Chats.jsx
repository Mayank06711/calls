// src/Components/Home/Sidebar/Chats/Chats.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { Search } from "@mui/icons-material";
import {
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  CircularProgress,
  Badge,
} from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import ChatArea from "./ChatArea";
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
  // Track when ChatService is initialized (needed for effect dependencies)
  const [chatServiceReady, setChatServiceReady] = useState(false);

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

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket]);

  // Fetch initial online users when socket is ready
  useEffect(() => {
    if (!isSocketReady || !chatServiceReady || !chatServiceRef.current) return;

    const fetchOnlineUsers = async () => {
      try {
        const onlineUserIds = await chatServiceRef.current.getOnlineUsers();
        console.log('🟢 [ChatList] Initial online users:', onlineUserIds);
        setOnlineUsers(new Set(onlineUserIds));
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
  // Add socket status selectors
  const socketStatus = useSelector((state) => state.socketMetrics);
  const { connected, authenticated } = socketStatus;

  // Check socket status and ensure authentication
  useEffect(() => {
    const checkSocketStatus = async () => {
      try {
        if ((!connected || !authenticated) && localStorage.getItem("token")) {
          await ensureSocketAuthenticated();
        }
        // ⚠️ ONLY set ready if actually connected AND authenticated
        if (connected && authenticated) {
          console.log('✅ Socket is ready - connected & authenticated');
          setIsSocketReady(true);
        } else {
          console.log('⏳ Socket not ready yet:', { connected, authenticated });
          setIsSocketReady(false);
        }
      } catch (error) {
        console.error("Socket connection/authentication failed:", error);
        setIsSocketReady(false);
      }
    };

    checkSocketStatus();
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
          { type: 'chat_message', userId: senderId } // Metadata for clickable notification
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
          {loadingInitial && selectedTab !== "chats" ? (
            <div className='flex justify-center p-4'>
              <CircularProgress size={24} />
            </div>
          ) : (
            <>
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
                  className={`flex items-center p-2 cursor-pointer hover:bg-light-accent/5 ${
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
                    <div className='flex items-center text-xs opacity-70'>
                      <span>@{user.username}</span>
                      <span
                        className={`ml-2 w-2 h-2 rounded-full ${
                          onlineUsers.has(user._id) ? "bg-green-500" : "bg-gray-400"
                        }`}
                        title={onlineUsers.has(user._id) ? "Online" : "Offline"}
                      />
                    </div>
                  </div>
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

              {/* Empty state for Users/Experts tabs */}
              {selectedTab !== "chats" && !loadingInitial && users.length === 0 && (
                <div className='text-center text-gray-500 p-4'>
                  No users found
                </div>
              )}

              {/* Empty state for Chats tab */}
              {selectedTab === "chats" && chatUsers.length === 0 && (
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
          />
        </div>
      ) : (
        <div className='hidden md:flex flex-1 h-full items-center justify-center'>
          <p className='text-light-text/50'>
            {!isSocketReady
              ? "Connecting to chat services..."
              : "Select a chat to start messaging"}
          </p>
        </div>
      )}
    </div>
  );
}

export default ChatSection;
