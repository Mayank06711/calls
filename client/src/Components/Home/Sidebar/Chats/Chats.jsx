// src/Components/Home/Sidebar/Chats/Chats.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Search } from "@mui/icons-material";
import {
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import ChatArea from "./ChatArea";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import { getAllUsersThunk } from "../../../../redux/thunks/userInfo.thunks";
import { isSocketAuthenticated } from "../../../../socket/authentication";

function ChatSection() {
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();

  // State management
  const [users, setUsers] = useState([]);
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  // Add state for socket readiness
  const [isSocketReady, setIsSocketReady] = useState(false);

  // Refs
  const observerRef = useRef();

  // Selectors
  const loadingInitial = useSelector(
    (state) => state.loaderState.loaders[LOADER_TYPES.GET_ALL_USERS]
  );
  const loadingMore = useSelector(
    (state) => state.loaderState.loaders[LOADER_TYPES.GET_MORE_USERS]
  );

  // Add socket status selectors
  const socketStatus = useSelector((state) => state.socketMetrics);
  const { connected, authenticated } = socketStatus;

  // Check socket status and ensure authentication
  useEffect(() => {
    const checkSocketStatus = async () => {
      try {
        if (!connected || !authenticated) {
          await ensureSocketAuthenticated();
        }
        setIsSocketReady(true);
      } catch (error) {
        console.error("Socket connection/authentication failed:", error);
        setIsSocketReady(false);
      }
    };

    checkSocketStatus();
  }, [connected, authenticated]);

  const fetchUsers = async (pageNum = 1, isLoadMore = false) => {
    if (!hasMore && isLoadMore) return;

    const result = await dispatch(
      getAllUsersThunk({
        page: pageNum,
        limit: 20,
        userType:
          selectedTab === "all"
            ? "all"
            : selectedTab === "experts"
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

  const lastUserElementRef = useCallback(
    (node) => {
      if (loadingMore || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchUsers(page + 1, true);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loadingMore, hasMore, page]
  );

  // Reset and fetch when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchUsers(1, false);
  }, [selectedTab, searchQuery]);

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

  // Modify handleUserSelect to check socket status
  const handleUserSelect = async (user) => {
    try {
      if (!isSocketAuthenticated()) {
        await ensureSocketAuthenticated();
      }
      setSelectedUser(user);
    } catch (error) {
      console.error("Socket authentication failed when selecting user:", error);
    }
  };

  // Add socket status indicator in the UI
  const renderSocketStatus = () => {
    if (!connected) {
      return (
        <div className="text-red-500 text-xs p-2 bg-red-100 rounded">
          Socket disconnected. Trying to reconnect...
        </div>
      );
    }
    if (!authenticated) {
      return (
        <div className="text-yellow-500 text-xs p-2 bg-yellow-100 rounded">
          Authenticating socket connection...
        </div>
      );
    }
    return null;
  };

  // console.log("users", users);
  return (
    <div className="flex h-full w-full bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text">
      <div className="w-96 border-r border-light-primary dark:border-dark-primary bg-light-secondary dark:bg-dark-secondary">
        {/* Add socket status indicator */}
        {renderSocketStatus()}
        {/* Search Bar */}
        <div className="p-2 border-b border-light-secondary dark:border-dark-secondary">
          <div className="flex items-center bg-light-primary dark:bg-dark-primary rounded-full px-3 py-1">
            <IconButton size="small">
              <Search className="text-light-text dark:text-dark-text opacity-50" />
            </IconButton>
            <input
              type="text"
              placeholder="Search by name or username..."
              className="ml-1 bg-transparent border-none outline-none w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-light-secondary/10">
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            variant="fullWidth"
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
            <Tab label="All" value="all" disableRipple />
            <Tab label="Users" value="users" disableRipple />
            <Tab label="Experts" value="experts" disableRipple />
          </Tabs>
        </div>

        {/* Users List */}
        <div className="overflow-y-auto h-[calc(100vh-160px)] p-2 scrollbar-hide">
          {loadingInitial ? (
            <div className="flex justify-center p-4">
              <CircularProgress size={24} />
            </div>
          ) : (
            <>
              {users.map((user, index) => (
                <div
                  key={user._id}
                  ref={index === users.length - 1 ? lastUserElementRef : null}
                  className={`flex items-center p-2 cursor-pointer hover:bg-light-accent/5 ${
                    selectedUser?._id === user._id ? "bg-light-accent/10" : ""
                  }`}
                  onClick={() => handleUserSelect(user)}
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
                  <div className="ml-2 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{user.fullName}</p>
                      <Chip
                        label={user.isExpert ? "Expert" : "User"}
                        size="small"
                        sx={{
                          backgroundColor: colors.second,
                          color: "white",
                          fontSize: "0.65rem",
                          height: "18px",
                        }}
                      />
                    </div>
                    <div className="flex items-center text-xs opacity-70">
                      <span>@{user.username}</span>
                      <span
                        className={`ml-2 w-2 h-2 rounded-full ${
                          user.isActive ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {loadingMore && (
                <div className="flex justify-center p-4">
                  <CircularProgress size={24} />
                </div>
              )}

              {!hasMore && users.length > 0 && (
                <div className="text-center text-gray-500 p-4">
                  No more users to load
                </div>
              )}

              {!loadingInitial && users.length === 0 && (
                <div className="text-center text-gray-500 p-4">
                  No users found
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedUser && isSocketReady ? (
        <ChatArea selectedUser={selectedUser} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-light-text/50">
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
