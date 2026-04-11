import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { IconButton, TextField, Tooltip } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { RiSendPlaneFill } from "react-icons/ri";
import CycloneIcon from "@mui/icons-material/Cyclone";

import MessageBubble from "./MessageBubble";
import { useDispatch, useSelector } from "react-redux";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import { processAIChat } from "../../../../redux/thunks/aiChating.thunks";
import { useAIContext } from "../../../../context/AIContext";

// Builds a rich system prompt from pageContext + userInfo + previous page transition
function buildSystemPrompt(pageContext, prevPageInfo) {
  const parts = [];

  // Identity
  parts.push("You are Strut AI, a helpful in-app assistant for the Strut social platform. Be concise, friendly, and context-aware.");

  // User info
  const u = pageContext?.userInfo;
  if (u) {
    const userParts = [];
    if (u.name) userParts.push(`Name: ${u.name}`);
    if (u.username) userParts.push(`Username: @${u.username}`);
    if (u.gender) userParts.push(`Gender: ${u.gender}`);
    if (u.age) userParts.push(`Age: ${u.age}`);
    if (u.city || u.country) userParts.push(`Location: ${[u.city, u.country].filter(Boolean).join(", ")}`);
    if (u.role) userParts.push(`Role: ${u.role}`);
    if (u.subscription) userParts.push(`Current subscription: ${u.subscription}`);
    if (userParts.length > 0) {
      parts.push(`Current user — ${userParts.join(", ")}.`);
    }
  }

  // Navigation transition (only the latest: from → to)
  if (prevPageInfo) {
    const currentLabel = getPageLabel(pageContext?.page);
    parts.push(`User just moved from ${prevPageInfo.label} to ${currentLabel}.`);
  }

  // Current page context
  if (pageContext?.description) {
    parts.push(`Current page context: ${pageContext.description}`);
  }

  // Chat context (if on chat page)
  if (pageContext?.chatContext) {
    const cc = pageContext.chatContext;
    if (cc.isPrivateChat) {
      parts.push("The user is in a private user-to-user chat. Message contents are not shared for privacy.");
    } else if (cc.recentConversation) {
      parts.push(`Recent chat messages:\n${cc.recentConversation}`);
    }
  }

  return parts.join("\n\n");
}

// Relative timestamp helper
export function getRelativeTime(timestamp) {
  if (!timestamp) return "";
  const now = new Date();
  const then = new Date(timestamp);
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// Friendly page label from context page key
function getPageLabel(page) {
  if (!page) return "App";
  const labels = {
    "chat": "Chat",
    "chats": "Chats",
    "reels": "Reels",
    "subscriptions": "Subscriptions",
    "subscriptions/gold": "Gold Plan",
    "subscriptions/silver": "Silver Plan",
    "subscriptions/platinum": "Platinum Plan",
    "settings/sessions": "Session Settings",
    "settings/analytics": "Analytics Settings",
    "settings/privacy": "Privacy Settings",
    "settings/preferences": "Preference Settings",
    "settings/notifications": "Notification Settings",
    "settings/theme": "Theme Settings",
    "settings/layout": "Layout Settings",
    "settings/accessibility": "Accessibility Settings",
    "settings/usage": "Usage Settings",
    "settings/reels": "Reels Settings",
    "profile": "Profile",
    "notifications": "Notifications",
    "settings": "Settings",
    "wardrobe": "Wardrobe Hub",
    "wardrobe/style-profile": "Style Profile",
    "wardrobe/my-closet": "My Closet",
    "wardrobe/suggest/full-outfit": "AI Outfit Suggestion",
    "wardrobe/suggest/from-item": "Mix & Match",
    "wardrobe/pairings": "All Pairings",
    "wardrobe/outfit-builder": "Outfit Builder",
    "wardrobe/outfits": "My Outfits",
    "wardrobe/outfits/detail": "Outfit Detail",
    "wardrobe/outfit-log": "Wear Log",
    "wardrobe/shop": "Shop",
  };
  return labels[page] || page.split("/").pop().replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function AIAssistant() {
  const [activeTypingId, setActiveTypingId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const colors = useSubscriptionColors();
  const userFullName = localStorage.getItem('fullName');

  const dispatch = useDispatch();
  const loaders = useSelector(state => state.loaderState.loaders);
  const user = useSelector(state => state.userInfo);
  const { pageContext } = useAIContext();

  // Session-based context: only rebuild prompt on first message or page change
  const lastContextPageRef = useRef(null);
  const sessionPromptRef = useRef(null);

  // Track the previous page for transition info (just the last page, not full journey)
  const prevPageInfoRef = useRef(null);

  // Track context changes for dividers
  const prevContextPageRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  const handleTyping = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Detect page context changes: insert a divider + track previous page for transition
  useEffect(() => {
    const currentPage = pageContext?.page || "unknown";
    const label = getPageLabel(currentPage);

    if (prevContextPageRef.current && prevContextPageRef.current !== currentPage) {
      // Store the previous page info for the transition context
      prevPageInfoRef.current = { page: prevContextPageRef.current, label: getPageLabel(prevContextPageRef.current) };
      // Force rebuild of system prompt on next message
      lastContextPageRef.current = null;

      // Insert divider in chat
      if (messages.length > 0) {
        setMessages(prev => [...prev, {
          id: `ctx-${Date.now()}`,
          sender: "system",
          text: label,
          timestamp: new Date().toISOString(),
        }]);
      }
    }
    prevContextPageRef.current = currentPage;
  }, [pageContext?.page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refocus input when typing/loading completes (field re-enables)
  useEffect(() => {
    if (!isTyping && !loaders[LOADER_TYPES.AI_CHAT_PROCESS]) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isTyping, loaders]);

  // Scroll tracking for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    }
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  const handleInputChange = useCallback((e) => {
    e.preventDefault();
    setInputMessage(e.target.value);
  }, []);

  const sendQuestion = useCallback(async (question) => {
    if (!question.trim()) return;

    if (isTyping) {
      setActiveTypingId(null);
      setIsTyping(false);
    }

    // Add user message
    const userMessage = {
      text: question,
      sender: "user",
      timestamp: new Date().toISOString(),
      isComplete: true,
      id: `user-${Date.now()}`,
    };

    // Temp AI message with loading state
    const tempAiMessage = {
      text: "",
      sender: "ai",
      timestamp: new Date().toISOString(),
      isComplete: false,
      id: `ai-${Date.now()}`,
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, tempAiMessage]);
    setInputMessage("");
    setActiveTypingId(tempAiMessage.id);
    setIsTyping(true);

    // Re-focus the input field after sending
    setTimeout(() => inputRef.current?.focus(), 50);

    try {
      // Rebuild system prompt only on first message or when page/chat context changes
      const contextKey = (pageContext?.page || "unknown") + "|" + (pageContext?.chatId || "");
      if (contextKey !== lastContextPageRef.current) {
        sessionPromptRef.current = buildSystemPrompt(pageContext, prevPageInfoRef.current);
        lastContextPageRef.current = contextKey;
        console.log(`[strutAI][${pageContext?.page || "unknown"}] context captured:`, sessionPromptRef.current);
      }

      const response = await dispatch(processAIChat({
        question,
        context: sessionPromptRef.current || "User is browsing the app",
        userInfo: pageContext?.userInfo || {
          name: user.data?.fullName || userFullName,
          gender: user.data?.gender,
          age: user.data?.age,
        },
        isSubscription: user.subscription?.type
      }));

      if (response && response.data) {
        setMessages(prev => prev.map(msg =>
          msg.id === tempAiMessage.id
            ? {
                ...msg,
                text: response.data || response.data.message,
                isComplete: false,
                isLoading: false,
              }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg =>
          msg.id === tempAiMessage.id
            ? {
                ...msg,
                text: "I couldn't get a response from the server. This might be a temporary issue.",
                isComplete: false,
                isLoading: false,
                isError: true,
                retryQuestion: question,
              }
            : msg
        ));
      }
    } catch (error) {
      console.error("[strutAI] error:", error.message);
      const errorText = error.message?.includes("timeout") || error.message?.includes("Timeout")
        ? "The request timed out. The server might be busy."
        : error.message?.includes("network") || error.message?.includes("Network") || error.message?.includes("Failed to fetch")
          ? "Network error. Please check your internet connection."
          : "Something went wrong while processing your request.";

      setMessages(prev => prev.map(msg =>
        msg.id === tempAiMessage.id
          ? {
              ...msg,
              text: errorText,
              isComplete: false,
              isLoading: false,
              isError: true,
              retryQuestion: question,
            }
          : msg
      ));
    } finally {
      setActiveTypingId(null);
      setIsTyping(false);
    }
  }, [isTyping, dispatch, pageContext, user, userFullName]);

  const handleSendMessage = useCallback(() => {
    sendQuestion(inputMessage);
  }, [inputMessage, sendQuestion]);

  const handleRetry = useCallback((question) => {
    // Remove the error message and the user message before it, then resend
    setMessages(prev => {
      const lastErrorIdx = prev.findLastIndex(m => m.isError && m.retryQuestion === question);
      if (lastErrorIdx === -1) return prev;
      const userMsgIdx = lastErrorIdx - 1;
      if (userMsgIdx >= 0 && prev[userMsgIdx].sender === "user") {
        return prev.filter((_, i) => i !== userMsgIdx && i !== lastErrorIdx);
      }
      return prev.filter((_, i) => i !== lastErrorIdx);
    });
    setTimeout(() => sendQuestion(question), 100);
  }, [sendQuestion]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Chat Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-1 pt-4 space-y-4 scrollbar-hide"
        onScroll={handleScroll}
      >
        {/* Initial AI welcome message */}
        <div className="flex items-start">
          <div className="flex items-start">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center -mr-2 z-10"
              style={{
                background: `linear-gradient(135deg, ${colors.first}, ${colors.third})`,
              }}
            >
              <CycloneIcon sx={{ color: colors.fourth, fontSize: 12 }} />
            </div>
            <div className="flex-1">
              <div
                className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-lg pl-4 p-2 shadow-sm"
                style={{ borderRadius: "15px", borderTopLeftRadius: "0" }}
              >
                <p className="text-sm">
                  Hi{userFullName ? `, ${userFullName.split(' ')[0]}` : ""}! I'm Strut AI — ask me anything about the app, your account, or what you see on this page.
                </p>
              </div>
              <span className="text-xs text-gray-400 ml-2 mt-1">
                Strut AI
              </span>
            </div>
          </div>
        </div>

        {/* Chat messages */}
        {messages.map((message) => (
          message.sender === "system" ? (
            // Context-change divider
            <div key={message.id} className="flex items-center gap-3 py-1 px-4">
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1">
                <CycloneIcon sx={{ fontSize: 10, color: colors.fourth }} />
                Moved to {message.text}
              </span>
              <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
            </div>
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              activeTypingId={activeTypingId}
              setActiveTypingId={setActiveTypingId}
              setIsTyping={setIsTyping}
              setMessages={setMessages}
              onTyping={handleTyping}
              onRetry={message.isError ? () => handleRetry(message.retryQuestion) : undefined}
            />
          )
        ))}

        {/* Bottom spacer */}
        <div className="h-2" />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
          style={{ backgroundColor: colors.fourth }}
        >
          <KeyboardArrowDownIcon sx={{ color: "white", fontSize: 20 }} />
        </button>
      )}

      {/* Input Area */}
      <div className="shrink-0 p-3 border-t dark:border-gray-700 border-gray-200/30">
        <div className="flex gap-2 items-end">
          <Tooltip title="Media not supported yet" arrow>
            <span className="flex items-center">
              <IconButton
                disabled
                size="small"
                sx={{ color: toRgba(colors.fourth, 0.6), mb: '2px' }}
              >
                <ImageOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            inputRef={inputRef}
            autoFocus
            disabled={loaders[LOADER_TYPES.AI_CHAT_PROCESS]}
            size="small"
            variant="outlined"
            InputProps={{
              placeholder: isTyping ? "Please wait..." : "Ask Strut AI...",
            }}
            InputLabelProps={{ shrink: false }}
            label=""
            sx={{
              "& .MuiOutlinedInput-root": {
                color: 'inherit',
                "& fieldset": {
                  borderColor: toRgba(colors.fourth, 0.6),
                },
                "&:hover fieldset": {
                  borderColor: colors.fourth,
                },
                "&.Mui-focused fieldset": {
                  borderColor: colors.fourth,
                },
              },
              "& .MuiInputBase-input": {
                color: 'inherit',
              },
              "& .MuiInputBase-input::placeholder": {
                color: 'inherit',
                opacity: 0.5,
              },
            }}
          />
          <IconButton
            style={{
              backgroundColor: colors.fourth,
              color: "white",
            }}
            className="hover:scale-105 transition-transform"
            onClick={handleSendMessage}
            disabled={loaders[LOADER_TYPES.AI_CHAT_PROCESS] || !inputMessage.trim()}
          >
            <RiSendPlaneFill />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
