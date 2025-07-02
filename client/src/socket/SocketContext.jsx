import { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector, useDispatch } from "react-redux";
import { SocketManager } from "./config";
import { ensureSocketAuthenticated } from "./authentication";
import { socketConnected, socketAuthenticated } from "../redux/actions/socket.actions";

// SocketContext provides a single source of truth for socket connection and authentication state
// It owns the SocketManager instance and exposes helpers and state to the app
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const userId = useSelector((state) => state.auth.userId);
  const dispatch = useDispatch();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (userId) {
      // On login: create/connect socket and authenticate
      const sock = SocketManager.getSocket(false, true);
      setSocket(sock);
      console.log("[SocketContext] Socket instance created:", sock);
      sock.on("connect", async () => {
        console.log("[SocketContext] Socket connected!");
        setIsConnected(true);
        // Always authenticate on new connection
        try {
          await ensureSocketAuthenticated();
          setIsAuthenticated(true);
          dispatch(socketConnected(true));
          dispatch(socketAuthenticated(true));
          console.log("[SocketContext] Socket authenticated!");
        } catch (err) {
          setIsAuthenticated(false);
          dispatch(socketAuthenticated(false));
          console.log("[SocketContext] Socket authentication failed:", err);
        }
      });
      sock.on("disconnect", () => {
        console.log("[SocketContext] Socket disconnected!");
        setIsConnected(false);
        setIsAuthenticated(false);
        dispatch(socketConnected(false));
        dispatch(socketAuthenticated(false));
      });
      // If already connected (e.g. hot reload), trigger authentication
      if (sock.connected) {
        (async () => {
          try {
            await ensureSocketAuthenticated();
            setIsAuthenticated(true);
            dispatch(socketConnected(true));
            dispatch(socketAuthenticated(true));
            console.log("[SocketContext] Socket authenticated!");
          } catch (err) {
            setIsAuthenticated(false);
            dispatch(socketAuthenticated(false));
            console.log("[SocketContext] Socket authentication failed:", err);
          }
        })();
      }
    } else {
      // On logout: disconnect socket and reset state
      SocketManager.disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      setIsAuthenticated(false);
      dispatch(socketConnected(false));
      dispatch(socketAuthenticated(false));
      console.log("[SocketContext] Socket disconnected due to logout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dispatch]);

  // Listen to socket events for connection/auth changes
  useEffect(() => {
    if (!socket) return;
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
      dispatch(socketAuthenticated(false));
      dispatch(socketConnected(false));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, dispatch]);

  // Expose helpers and state via context
  const contextValue = {
    socket,
    isConnected,
    isAuthenticated,
    ensureSocketAuthenticated,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the socket context
export const useSocketContext = () => useContext(SocketContext); 

/*
========================================
Socket Authentication Flow: All Major Cases
========================================

1. User Successful Login
------------------------
- Redux sets userId and token in localStorage.
- <SocketProvider> detects userId, creates and connects a new socket.
- On socket 'connect', always calls ensureSocketAuthenticated().
- Emits 'authenticate' event with latest token to server.
- On server confirmation, sets Redux and context authenticated flags to true.
- All socket actions (chat, upload, etc.) now work without re-authenticating.

2. Page Refresh
---------------
- App reloads, Redux state is rehydrated from localStorage.
- <SocketProvider> runs again, sees userId/token, creates and connects socket.
- On socket 'connect', always calls ensureSocketAuthenticated().
- Emits 'authenticate' event with latest token to server.
- Server confirms, sets authenticated flags.
- No duplicate authentication events are sent for already authenticated sockets.

3. Page Visibility Changes (Tab Hidden/Visible)
-----------------------------------------------
- If page becomes visible and socket is disconnected, ensureSocketAuthenticated() is called (see authentication.js visibility listener).
- If socket is not authenticated, emits 'authenticate' event.
- If already authenticated, does nothing.
- Ensures real-time features resume after tab inactivity/network loss.

4. User Logs Out on One Page (Multi-Tab)
----------------------------------------
- When user logs out, localStorage token/userId are removed.
- Storage event triggers in all open tabs.
- <SocketProvider> detects userId is null, disconnects socket, resets all flags.
- All tabs are logged out and real-time features are disabled.

5. Token Expired
----------------
- On any socket action, if server responds with token_expired, onError handler in authentication.js triggers token refresh.
- If refresh is successful, new token is set in localStorage, and socket is disconnected and re-authenticated with new token.
- If refresh fails, user is logged out and notified.
- No retry loops with old/expired tokens.

========================================
This flow ensures:
- Only one authentication event per socket connection.
- No duplicate or unnecessary authentication events.
- Robust handling of login, logout, refresh, tab changes, and token expiry.
- Redux is only used for flags/metrics, not as source of truth for socket state.
- All socket actions check authentication before proceeding, but do not re-authenticate if already authenticated.
*/ 