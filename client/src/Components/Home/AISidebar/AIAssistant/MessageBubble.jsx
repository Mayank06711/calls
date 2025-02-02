import React, { useState } from "react";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import CycloneIcon from "@mui/icons-material/Cyclone";
import TypingEffect from "../../../Animation/TypingEffect";


const MessageBubble = React.memo(({ message,activeTypingId,setActiveTypingId,setIsTyping,setMessages }) => {
    const colors = useSubscriptionColors();
 

    const isAI = message.sender === "ai";
    const [isMessageComplete, setIsMessageComplete] = useState(
      message.isComplete
    );
    const isActiveTyping = activeTypingId === message.id;
    const shouldStopTyping = activeTypingId && activeTypingId !== message.id;

    const handleTypingComplete = React.useCallback(() => {
      setIsMessageComplete(true);
      if (isActiveTyping) {
        setActiveTypingId(null);
        setIsTyping(false);
      }
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, isComplete: true } : msg
        )
      );
    },[]);

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
                    borderRadius: "10px",
                    borderTopRightRadius: "0",
                  }
                : {}
            }
          >
            {isAI && !isMessageComplete ? (
              <TypingEffect
                key={message.id}
                text={message.text}
                stopTyping={shouldStopTyping}
                onComplete={handleTypingComplete}
              />
            ) : (
              <p>{message.text}</p>
            )}
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
  },(prevProps,nextProps)=>{
    return prevProps.message.text === nextProps.message.text &&
    prevProps.message.isComplete === nextProps.message.isComplete;
  });

  export default MessageBubble;