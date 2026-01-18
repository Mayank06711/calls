import React, { useEffect, useRef } from "react";
import MessageStatus from "./MessageStatus";
import { format } from "date-fns";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { Avatar } from "@mui/material";
import "./MessageList.css";

const MessageList = ({ messages, currentUserId, onMessageSeen }) => {
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const colors = useSubscriptionColors();

  useEffect(() => {
    scrollToBottom();
    setupIntersectionObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [messages]);

  const setupIntersectionObserver = () => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            if (messageId) {
              onMessageSeen(messageId);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    document
      .querySelectorAll('.message-item[data-unread="true"]')
      .forEach((element) => observerRef.current.observe(element));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper function to convert hex to rgb for background opacity
  // Helper function to convert hex to rgb numbers
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  // Helper to create rgba string
  const createRgba = (hex, alpha = 1) => {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  };

  const renderMessageContent = (message) => {
    console.log("message from chat render", message);
    switch (message.type) {
      case "image":
        return (
          <div className="relative group">
            <img
              src={message.content}
              alt={message.fileName || "Image"}
              className="max-w-[300px] rounded-lg cursor-pointer"
              onClick={() => window.open(message.content, "_blank")}
            />
            {message.fileName && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
                {message.fileName}
              </div>
            )}
          </div>
        );
      case "text":
      default:
        return <p className="text-sm">{message.content}</p>;
    }
  };

  console.log("Colors:", colors);
  console.log("hexToRgb first:", hexToRgb(colors.first));
  console.log("hexToRgb third:", hexToRgb(colors.third));

  return (
    <div
      className="flex-1 w-full  overflow-y-scroll px-4 pt-2 space-y-2 scrollbar-hide"
      style={{
        scrollbarColor: `${colors.third} transparent`,
        scrollbarWidth: "thin",
      }}
    >
      {messages.map((message, idx) => {
        const isSender = message.senderId === currentUserId;
        // Use unique key combining chatId, messageId and index as fallback
        const uniqueKey = `${message.chatId || 'chat'}-${message.id || idx}-${idx}`;

        return (
          <div
            key={uniqueKey}
            className={`flex items-end ${
              isSender ? "justify-end" : "justify-start"
            } `}
            data-message-id={message.id}
            data-unread={!isSender && message.status !== "seen"}
          >
            {!isSender && (
              <Avatar
                src={message.senderAvatar}
                alt={message.senderName}
                sx={{
                  width: 24,
                  height: 24,
                  bgcolor: colors.third,
                  border: `2px solid ${colors.fourth}`,
                }}
              />
            )}

            <div
              className={`max-w-[70%] flex  flex-col ${
                isSender ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-2 shadow-sm break-all ${
                  isSender && message.id ? "" : "pop-bubble"
                } ${
                  isSender ? "rounded-br-[0] sender" : "rounded-bl-[0] receiver"
                } ${
                  !isSender
                    ? "bg-gradient-to-br from-slate-100/50 to-slate-200/50 dark:from-slate-700/50 dark:to-slate-600/50 border-l-2 border-slate-300 dark:border-slate-600"
                    : ""
                }`}
                style={{
                  background: isSender
                    ? `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`
                    : undefined,
                  borderRight: isSender
                    ? `2px solid ${colors.fourth}`
                    : undefined,
                }}
              >
                <div
                  className={
                    isSender
                      ? "text-white"
                      : "text-light-text dark:text-dark-text"
                  }
                >
                  {renderMessageContent(message)}
                </div>
              </div>

              <div
                className={`flex items-center gap-1  text-light-text/50 dark:text-dark-text/50 text-[10px] ${
                  isSender ? "flex-row" : "ml-2"
                }`}
              >
                <span>{format(new Date(message.timestamp), "HH:mm")}</span>
                {isSender && (
                  <MessageStatus
                    status={message.status}
                    seenColor={colors.fourth}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
