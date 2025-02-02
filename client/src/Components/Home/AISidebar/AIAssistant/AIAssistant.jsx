import React, { useEffect, useRef, useState } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { IconButton, TextField } from "@mui/material";
import { RiSendPlaneFill } from "react-icons/ri";
import CycloneIcon from "@mui/icons-material/Cyclone";
import { getRandomResponse } from "../../../../constants/dummyMessages";

function AIAssistant() {
  const [isStarted, setIsStarted] = useState(false);
  const colors = useSubscriptionColors();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage = {
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    // Get AI response
    const aiResponse = {
      text: getRandomResponse().text,
      sender: "ai",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setInputMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Message component
  const MessageBubble = ({ message }) => {
    const isAI = message.sender === "ai";

    return (
      <div className={`flex items-start ${isAI ? "" : "justify-end"}`}>
        {isAI && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center -mr-2 z-10"
            style={{
              background: `linear-gradient(135deg, ${colors.first}, ${colors.third})`,
            }}
          >
            <CycloneIcon sx={{ color: colors.fourth, fontSize: 12 }} />
          </div>
        )}
        <div className={`flex-1 ${isAI ? "" : "text-right"}`}>
          <div
            className={`${
              isAI
                ? "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800"
                : "bg-gradient-to-l from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800"
            } rounded-lg pl-4 p-2 shadow-sm`}
            style={
              !isAI
                ? {
                    background: `linear-gradient(135deg, ${colors.second}20, ${colors.third}30)`,
                    borderRadius: "16px",
                    borderTopRightRadius: "0",
                  }
                : {}
            }
          >
            <p>{message.text}</p>
          </div>
          <span
            className={`text-xs text-gray-400 ${isAI ? "ml-2" : "mr-2"} mt-1`}
          >
            {isAI ? "Strut AI" : "You"}
          </span>
        </div>
        {!isAI && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center -ml-2 z-10"
            style={{
              background: `linear-gradient(135deg, ${colors.second}, ${colors.third})`,
            }}
          >
            <span className="text-white text-xs font-medium">H</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col">
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
        <div className="flex flex-col h-full">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4 scrollbar-hide">
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
              <MessageBubble key={index} message={message} />
            ))}

            {/* Invisible element for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex gap-2 items-center">
              <TextField
                fullWidth
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                size="small"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: `${colors.fourth}50`,
                    },
                    "&:hover fieldset": {
                      borderColor: colors.fourth,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: colors.fourth,
                    },
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
