import React, { useState, useEffect } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import CycloneIcon from "@mui/icons-material/Cyclone";
import TypingEffect from "../../../Animation/TypingEffect";
import { motion, AnimatePresence } from "framer-motion";
import CircularProgress from '@mui/material/CircularProgress';

const MessageBubble = React.memo(({ 
  message, 
  activeTypingId, 
  setActiveTypingId, 
  setIsTyping, 
  setMessages,
  onTyping 
}) => {
  const colors = useSubscriptionColors();
  const isAI = message.sender === "ai";
  const [isMessageComplete, setIsMessageComplete] = useState(message.isComplete);
  const [showTyping, setShowTyping] = useState(isAI && !message.isComplete);

  useEffect(() => {
    if (isAI && !message.isComplete) {
      setShowTyping(true);
    }
  }, [isAI, message.isComplete]);

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
  }, [message.id, activeTypingId, setActiveTypingId, setIsTyping, setMessages]);

  const handleCharacterType = React.useCallback((currentText) => {
    if (onTyping) {
      onTyping(message.id, currentText);
    }
  }, [message.id, onTyping]);

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
                  color: "white",
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
                <CircularProgress size={16} thickness={6} sx={{ color: colors.fourth }} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Thinking...
                </span>
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
              <motion.p
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-sm whitespace-pre-wrap"
              >
                {message.text}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
        <span
          className={`text-xs text-gray-400 ${
            isAI ? "ml-2" : "mr-2"
          } mt-1 block`}
        >
          {isAI ? "Strut AI" : "You"}
        </span>
      </div>
      {!isAI && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center -ml-2 z-10"
          style={{
            background: `linear-gradient(135deg, ${colors.second}, ${colors.third})`,
          }}
        >
          <span className="text-white text-sm font-medium">Y</span>
        </div>
      )}
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isComplete === nextProps.message.isComplete &&
    prevProps.activeTypingId === nextProps.activeTypingId &&
    prevProps.message.isLoading === nextProps.message.isLoading
  );
});

export default MessageBubble;