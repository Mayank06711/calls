import React, { useEffect, useRef, useState } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { IconButton, TextField } from "@mui/material";
import { RiSendPlaneFill } from "react-icons/ri";
import CycloneIcon from "@mui/icons-material/Cyclone";
import { getRandomResponse } from "../../../../constants/dummyMessages";
import MessageBubble from "./MessageBubble";
import { useDispatch, useSelector } from "react-redux";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import { processAIChat } from "../../../../redux/thunks/aiChating.thunks";

function AIAssistant() {
  const [isStarted, setIsStarted] = useState(false);
  const [activeTypingId, setActiveTypingId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const colors = useSubscriptionColors();
  const userFullName = localStorage.getItem('fullName');

  const dispatch = useDispatch();
  const loaders = useSelector(state => state.loaderState.loaders);
  const user=useSelector(state => state.userInfo);
  console.log("111111111111111",user);
  // const userInfo = useSelector(state => state.auth.userInfo); // Assuming you have user info in auth reducer
  // const subscription = useSelector(state => state.subscription.type); // Assuming you have subscription info

  const messagesContainerRef = useRef(null);
  
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleTyping = React.useCallback(() => {
    scrollToBottom();
  }, []);

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

  const handleSendMessage = React.useCallback(async () => {
    console.log("00000000000000000")
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
    const tempAiMessage = {
      text: "... ",
      sender: "ai",
      timestamp: new Date().toISOString(),
      isComplete: false,
      id: `ai-${Date.now()}`,
      isLoading: true,
    };

    // Stop any current typing and start new message
    setMessages(prev => [...prev, userMessage, tempAiMessage]);
    setInputMessage("");
    setActiveTypingId(tempAiMessage.id);
    setIsTyping(true);

    try {
      console.log("2222222222222")
      const response = await dispatch(processAIChat({
        question: inputMessage,
        context: `user is going to wear something cool`,
        userInfo: {
          name: user.data?.fullName||userFullName,
          gender: user.data?.gender,
          skinColor:  "Medium Skin",
          age:  user.data?.age,
          height:  "45",
          colorsILove:  "pink"
        },
        isSubscription: user.subscription?.type
      }));

      if (response && response.data) {
        console.log("3333333333333333")
        // Update the temporary AI message with the actual response
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
        // If there's an error, update the temporary message to show error
        setMessages(prev => prev.map(msg => 
          msg.id === tempAiMessage.id 
            ? {
                ...msg,
                text: "Sorry, I couldn't process your request. Please try again.",
                isComplete: false,
                isLoading: false,
              }
            : msg
        ));
      }
    } catch (error) {
      // Handle error case
      console.log("444444444444444444error", error.message);
      setMessages(prev => prev.map(msg => 
        msg.id === tempAiMessage.id 
          ? {
              ...msg,
              text: "Sorry, something went wrong. Please try again later.",
              isComplete: false,
              isLoading: false,
            }
          : msg
      ));
    } finally {
      setActiveTypingId(null);
      setIsTyping(false);
    }

  },[inputMessage,isTyping, loaders, dispatch]);

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
        <div className="flex flex-col h-full relative">
        {/* Chat Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-1 pb-2 pt-4 space-y-4 scrollbar-hide"
          style={{ paddingBottom: '80px' }}
        >
          {/* Initial AI message */}
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

          {/* Chat messages in chronological order */}
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              activeTypingId={activeTypingId} 
              setActiveTypingId={setActiveTypingId} 
              setIsTyping={setIsTyping} 
              setMessages={setMessages}
              onTyping={handleTyping}
            />
          ))}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
          <div className="flex gap-2 items-center">
            <TextField
              fullWidth
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={
                isTyping ? "Please wait..." : "Type your message..."
              }
              disabled={loaders[LOADER_TYPES.AI_CHAT_PROCESS]}
              size="small"
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: 'inherit',
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


      )}
    </div>
  );
}

export default AIAssistant;
