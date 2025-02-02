import React, { useEffect, useRef, useState } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { IconButton, TextField } from "@mui/material";
import { RiSendPlaneFill } from "react-icons/ri";
import CycloneIcon from "@mui/icons-material/Cyclone";
import { getRandomResponse } from "../../../../constants/dummyMessages";
import MessageBubble from "./MessageBubble";

function AIAssistant() {
  const [isStarted, setIsStarted] = useState(false);
  const [activeTypingId, setActiveTypingId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const colors = useSubscriptionColors();
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = React.useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  const handleInputChange = React.useCallback((e) => {
    e.preventDefault();
    setInputMessage(e.target.value);
  }, []);

  const handleSendMessage = React.useCallback(() => {
    if (!inputMessage.trim()) return;

    if (isTyping) {
      setActiveTypingId(null);
      setIsTyping(false);
    }
    // Add user message
    const userMessage = {
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
      isComplete: true,
      id: `user-${Date.now()}`, // Add unique ID for each message
    };

    // Get AI response
    const aiResponse = {
      text: getRandomResponse().text,
      sender: "ai",
      timestamp: new Date().toISOString(),
      isComplete: false,
      id: `ai-${Date.now()}`,
    };

    // Stop any current typing and start new message
    setActiveTypingId(aiResponse.id);
    setIsTyping(true);
    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setInputMessage("");
  },[inputMessage,isTyping]);

  // Message component
 

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {!isStarted ? (
        // Welcome Screen
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="text-center space-y-4">
            <h3
              className="text-2xl font-semibold"
              style={{ color: colors.fourth }}
            >
              Welcome to Strut AI
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              I'm here to help you with your questions and tasks. Let's start a
              conversation!
            </p>
            <button
              className="px-6 py-2.5 rounded-lg text-white transition-all duration-300 "
              style={{ backgroundColor: colors.fourth }}
              onClick={() => setIsStarted(true)}
            >
              Start Chat
            </button>
          </div>
        </div>
      ) : (
        // Chat Interface
        <div className="flex flex-col h-full ">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-1 pb-2 pt-4 space-y-4 scrollbar-hide">
            {/* Initial AI message  */}
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
                    className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 
                     rounded-lg pl-4 p-2 shadow-sm"
                  >
                    <p>Hi! How can I assist you today?</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-2 mt-1">
                    Strut AI
                  </span>
                </div>
              </div>
            </div>

            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} activeTypingId={activeTypingId} setActiveTypingId={setActiveTypingId} setIsTyping={setIsTyping} setMessages={setMessages}/>
            ))}

            {/* Invisible element for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t dark:border-gray-700 ">
            <div className="flex gap-2 items-center ">
              <TextField
                fullWidth
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  isTyping ? "Please wait..." : "Type your message..."
                }
                size="small"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: 'inherit', // This will inherit from parent theme
                    "&:hover fieldset": {
                      borderColor: colors.fourth,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: colors.fourth,
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: 'inherit', // This ensures the input text follows theme
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: 'inherit', // This makes placeholder inherit theme color
                    opacity: 0.5, // Reduced opacity to distinguish from actual text
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
              >
                <RiSendPlaneFill />
              </IconButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistant;
