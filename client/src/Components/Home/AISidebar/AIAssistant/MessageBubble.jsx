import React, { useState, useEffect } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import CycloneIcon from "@mui/icons-material/Cyclone";
import ReplayIcon from "@mui/icons-material/Replay";
import TypingEffect from "../../../Animation/TypingEffect";
import { motion, AnimatePresence } from "framer-motion";
import { getRelativeTime } from "./AIAssistant";

// Animated bouncing dots for loading state
function LoadingDots({ color }) {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            backgroundColor: color,
            animation: `strutAIDotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes strutAIDotBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const MessageBubble = React.memo(
  ({
    message,
    activeTypingId,
    setActiveTypingId,
    setIsTyping,
    setMessages,
    onTyping,
    onRetry,
  }) => {
    const colors = useSubscriptionColors();
    const isAI = message.sender === "ai";
    const [isMessageComplete, setIsMessageComplete] = useState(
      message.isComplete
    );
    const [showTyping, setShowTyping] = useState(isAI && !message.isComplete);
    const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(message.timestamp));
    const storedUser = JSON.parse(localStorage.getItem("userInfo"));
    const isDarkMode = JSON.parse(localStorage.getItem("isDarkMode")) || false;

    useEffect(() => {
      if (isAI && !message.isComplete) {
        setShowTyping(true);
      }
    }, [isAI, message.isComplete]);

    // Update relative timestamps every 30 seconds
    useEffect(() => {
      const interval = setInterval(() => {
        setRelativeTime(getRelativeTime(message.timestamp));
      }, 30000);
      return () => clearInterval(interval);
    }, [message.timestamp]);

    const handleTypingComplete = React.useCallback(() => {
      setIsMessageComplete(true);
      setShowTyping(false);
      if (activeTypingId === message.id) {
        setActiveTypingId(null);
        setIsTyping(false);
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, isComplete: true } : msg
        )
      );
    }, [
      message.id,
      activeTypingId,
      setActiveTypingId,
      setIsTyping,
      setMessages,
    ]);

    const handleCharacterType = React.useCallback(
      (currentText) => {
        if (onTyping) {
          onTyping(message.id, currentText);
        }
      },
      [message.id, onTyping]
    );

    // Use fullName (stored in localStorage) with fallback to name or username
    const displayName = storedUser?.fullName || storedUser?.name || storedUser?.username || "";

    const renderUserAvatar = () => {
      if (storedUser?.photo?.url || storedUser?.photo?.thumbnailUrl) {
        return (
          <img
            src={storedUser.photo.thumbnailUrl || storedUser.photo.url}
            alt={`${displayName}'s avatar`}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.innerHTML = `<span class="text-white text-sm font-medium dark:text-gray-200">${
                displayName?.[0]?.toUpperCase() || "U"
              }</span>`;
            }}
          />
        );
      }
      return (
        <span className="text-white text-sm font-medium dark:text-gray-200">
          {displayName?.[0]?.toUpperCase() || "U"}
        </span>
      );
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex items-start ${isAI ? "" : "justify-end"} mb-4`}
      >
        {isAI && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center -mr-2 z-10"
            style={{
              background: `linear-gradient(135deg, ${colors.first}, ${colors.third})`,
            }}
          >
            <CycloneIcon sx={{ color: colors.fourth, fontSize: 16 }} />
          </div>
        )}
        <div className={`flex-1 max-w-[80%] ${isAI ? "" : "text-right"}`}>
          <motion.div
            className={`${
              isAI
                ? "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800"
                : "bg-gradient-to-l from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800"
            } rounded-lg pl-4 p-3 shadow-sm`}
            style={
              !isAI
                ? {
                    borderRadius: "15px",
                    borderTopRightRadius: "0",
                    backgroundColor: colors.fourth,
                    color: isDarkMode ? "#ffffff" : "#000000",
                  }
                : {
                    borderRadius: "15px",
                    borderTopLeftRadius: "0",
                  }
            }
          >
            <AnimatePresence mode="wait">
              {isAI && message.isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <LoadingDots color={colors.fourth} />
                </motion.div>
              ) : isAI && showTyping ? (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-h-[24px]"
                >
                  <TypingEffect
                    text={message.text}
                    stopTyping={activeTypingId && activeTypingId !== message.id}
                    onComplete={handleTypingComplete}
                    onCharacterType={handleCharacterType}
                    speed={30}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  {/* Retry button for error messages */}
                  {message.isError && onRetry && (
                    <button
                      onClick={onRetry}
                      className="mt-2 flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: `${colors.fourth}20`,
                        color: colors.fourth,
                      }}
                    >
                      <ReplayIcon sx={{ fontSize: 14 }} />
                      Retry
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* Sender label + relative timestamp */}
          <span
            className={`text-xs text-gray-400 ${
              isAI ? "ml-2" : "mr-2"
            } mt-1 block`}
          >
            {isAI ? "Strut AI" : "You"}
            {relativeTime && (
              <span className="ml-1.5 opacity-60">· {relativeTime}</span>
            )}
          </span>
        </div>
        {/*  user avatar container */}
        {!isAI && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center -ml-2 z-10 overflow-hidden shadow-lg dark:shadow-gray-900"
            style={{
              background: `linear-gradient(135deg, ${colors.second}, ${colors.third})`,
            }}
          >
            {renderUserAvatar()}
          </div>
        )}
      </motion.div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.message.text === nextProps.message.text &&
      prevProps.message.isComplete === nextProps.message.isComplete &&
      prevProps.activeTypingId === nextProps.activeTypingId &&
      prevProps.message.isLoading === nextProps.message.isLoading &&
      prevProps.message.isError === nextProps.message.isError &&
      prevProps.onRetry === nextProps.onRetry
    );
  }
);

export default MessageBubble;
