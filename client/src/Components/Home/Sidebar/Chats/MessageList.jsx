import React, { useEffect, useRef } from "react";
import MessageStatus from "./MessageStatus";
import { format } from "date-fns";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { Avatar } from "@mui/material";

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
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
          result[3],
          16
        )}`
      : "255, 255, 255";
  };

  const renderMessageContent = (message) => {
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

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pt-2 space-y-2 bg-red-500"
      style={{
        scrollbarColor: `${colors.third} transparent`,
        scrollbarWidth: "thin",
      }}
    >
      {messages.map((message) => {
        const isSender = message.senderId === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex items-end  bg-green-700 ${
              isSender ? "justify-end" : "justify-start"
            } message-item`}
            data-message-id={message.id}
            data-unread={!isSender && message.status !== "seen"}
          >
            {!isSender && (
              <Avatar
                src={message.senderAvatar}
                alt={message.senderName}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: colors.third,
                  border: `2px solid ${colors.fourth}`,
                }}
              />
            )}

            <div
              className={`max-w-[70%] flex text-wrap overflow-hidden bg-yellow-500 flex-col ${
                isSender ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`rounded-2xl px-4 py-2  shadow-sm ${
                  isSender ? "rounded-br-sm" : "rounded-bl-sm"
                }`}
                style={{
                  background: isSender
                    ? `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`
                    : `linear-gradient(135deg, rgba(${hexToRgb(
                        colors.first
                      )}, 0.1), rgba(${hexToRgb(colors.third)}, 0.1))`,
                  borderLeft: !isSender ? `2px solid ${colors.third}` : "none",
                  borderRight: isSender ? `2px solid ${colors.fourth}` : "none",
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
                className={`flex items-center gap-1 mt-1 text-xs ${
                  isSender ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <span className="text-light-text/50 dark:text-dark-text/50">
                  {format(new Date(message.timestamp), "HH:mm")}
                </span>
                {isSender && (
                  <MessageStatus
                    status={message.status}
                    color={colors.fourth}
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
