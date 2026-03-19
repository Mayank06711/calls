import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useSocketContext } from "../socket/SocketContext";
import ChatService from "../socket/chatService";
import { makeRequest } from "../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../constants/apiEndpoints";
import { showNotification } from "../redux/actions/notification.actions";

export function useInstantExpert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { socket, isAuthenticated } = useSocketContext();
  const chatServiceRef = useRef(null);

  const findExpert = useCallback(
    async (category) => {
      if (loading) return { success: false, reason: "already_loading" };

      setLoading(true);
      setError(null);

      try {
        // Step 1: Call API to find an available expert
        const result = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.EXPERT.INSTANT, {
          category,
        });

        // makeRequest returns response.data on success, or { data: null, error } on failure
        if (result.error) {
          throw new Error(result.error.message || "Failed to find expert");
        }

        if (!result.data?.success || !result.data?.data?.expert) {
          setError("no_experts");
          setLoading(false);
          return { success: false, reason: "no_experts" };
        }

        const expert = result.data.data.expert;

        // Step 2: Send chat request via socket (auto-accepts for user→expert)
        if (!socket || !isAuthenticated) {
          throw new Error("Connection not ready. Please try again in a moment.");
        }

        if (!chatServiceRef.current) {
          chatServiceRef.current = new ChatService(socket);
        } else {
          chatServiceRef.current.updateSocket(socket);
        }

        const chatResponse = await chatServiceRef.current.sendChatRequest(
          expert.userId
        );

        if (chatResponse.status === "error") {
          throw new Error(
            chatResponse.message || "Failed to connect with expert"
          );
        }

        // Step 3: Navigate to chat with this expert
        navigate(`/chats/${expert.userId}`);

        setLoading(false);
        return { success: true, expert };
      } catch (err) {
        setError(err.message);
        dispatch(
          showNotification(err.message || "Something went wrong", 500)
        );
        setLoading(false);
        return { success: false, reason: "error", message: err.message };
      }
    },
    [socket, isAuthenticated, navigate, dispatch, loading]
  );

  return { findExpert, loading, error };
}
