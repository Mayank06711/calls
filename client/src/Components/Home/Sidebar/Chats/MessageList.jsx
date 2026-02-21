import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MessageStatus from "./MessageStatus";
import MessageActionMenu from "./MessageActionMenu";
import MessageDetailsDialog from "./MessageDetailsDialog";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { Avatar } from "@mui/material";
import { Close, ContentCopy, Delete, DeleteForever, Info, Save, PlayArrow, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import "./MessageList.css";

const MessageList = ({
  messages,
  currentUserId,
  otherUserName,
  onMessageSeen,
  chatId,
  chatServiceRef,
  onDeleteMessage,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const colors = useSubscriptionColors();
  const [lightbox, setLightbox] = useState(null); // { src, fileName, type, message }
  const [detailsMessage, setDetailsMessage] = useState(null);

  const openLightbox = useCallback((src, fileName, type = "image", message = null) => {
    setLightbox({ src, fileName, type, message });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox, closeLightbox]);

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

  // Download file — Cloudinary fl_attachment, fallback to blob, then new tab
  const handleDownload = async (src, fileName) => {
    const name = fileName || "download";
    if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
      window.location.href = src.replace("/upload/", "/upload/fl_attachment/");
      return;
    }
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  };

  // Copy text to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // Delete for me
  const handleDeleteForMe = async (messageId) => {
    const service = chatServiceRef?.current;
    if (service && chatId) {
      const success = await service.deleteMessageForMe(chatId, messageId);
      if (success && onDeleteMessage) onDeleteMessage(messageId, "me");
    }
  };

  // Delete for everyone
  const handleDeleteForEveryone = async (messageId) => {
    const service = chatServiceRef?.current;
    if (service && chatId) {
      const result = await service.deleteMessageForEveryone(chatId, messageId);
      if (result.success && onDeleteMessage) onDeleteMessage(messageId, "everyone");
    }
  };

  // Build action menu items for a message bubble
  const getBubbleMenuItems = (message, isSender) => {
    const items = [];

    if (message.type === "text") {
      items.push({
        label: "Copy",
        icon: <ContentCopy sx={{ fontSize: 16 }} />,
        onClick: () => handleCopy(message.content),
      });
    }

    items.push({
      label: "Delete for me",
      icon: <Delete sx={{ fontSize: 16 }} />,
      onClick: () => handleDeleteForMe(message.id),
      danger: true,
    });

    if (isSender) {
      items.push({
        label: "Delete for everyone",
        icon: <DeleteForever sx={{ fontSize: 16 }} />,
        onClick: () => handleDeleteForEveryone(message.id),
        danger: true,
      });
    }

    items.push({
      label: "Details",
      icon: <Info sx={{ fontSize: 16 }} />,
      onClick: () => setDetailsMessage(message),
    });

    return items;
  };

  // Build action menu items for lightbox
  const getLightboxMenuItems = () => {
    if (!lightbox?.message) return [];
    const msg = lightbox.message;
    const isSender = msg.senderId === currentUserId;
    const items = [
      {
        label: "Save",
        icon: <Save sx={{ fontSize: 16 }} />,
        onClick: () => handleDownload(lightbox.src, lightbox.fileName),
      },
      {
        label: "Delete for me",
        icon: <Delete sx={{ fontSize: 16 }} />,
        onClick: () => {
          handleDeleteForMe(msg.id);
          closeLightbox();
        },
        danger: true,
      },
    ];

    if (isSender) {
      items.push({
        label: "Delete for everyone",
        icon: <DeleteForever sx={{ fontSize: 16 }} />,
        onClick: () => {
          handleDeleteForEveryone(msg.id);
          closeLightbox();
        },
        danger: true,
      });
    }

    items.push({
      label: "Details",
      icon: <Info sx={{ fontSize: 16 }} />,
      onClick: () => {
        setDetailsMessage(msg);
        closeLightbox();
      },
    });

    return items;
  };

  const isUploading = (message) =>
    message.status === "sending" && (message.type === "image" || message.type === "video");

  // Detect URLs in text and render them as clickable links
  // Outfit links navigate to in-app detail page; other internal links navigate in-app; external links open new tab
  const linkifyText = (text, isSender) => {
    if (!text) return text;
    const parts = text.split(/(https?:\/\/[^\s<]+)/g);
    if (parts.length === 1) return text; // no URLs found
    return parts.map((part, i) => {
      if (!part.match(/^https?:\/\//)) {
        return <React.Fragment key={i}>{part}</React.Fragment>;
      }
      const isInternal = part.startsWith(window.location.origin);
      return (
        <a
          key={i}
          href={part}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="underline break-all font-medium hover:opacity-80"
          style={{ color: isSender ? "#bfdbfe" : "#3b82f6" }}
          onClick={(e) => {
            e.stopPropagation();
            if (isInternal) {
              e.preventDefault();
              try {
                navigate(new URL(part).pathname);
              } catch {
                window.location.href = part;
              }
            }
          }}
        >
          {part}
        </a>
      );
    });
  };

  const renderMessageContent = (message, isSender) => {
    const uploading = isUploading(message);

    switch (message.type) {
      case "image":
        return (
          <div className="relative group">
            <img
              src={message.content}
              alt={message.fileName || "Image"}
              className={`max-w-[180px] sm:max-w-[300px] rounded-lg transition-opacity ${
                uploading ? "opacity-50" : "cursor-pointer hover:opacity-90"
              }`}
              onClick={uploading ? undefined : () => openLightbox(message.content, message.fileName, "image", message)}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white text-xs font-medium">Sending...</span>
                </div>
              </div>
            )}
            {!uploading && message.fileName && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg">
                {message.fileName}
              </div>
            )}
          </div>
        );
      case "video":
        return (
          <div
            className={`relative group cursor-pointer max-w-[180px] sm:max-w-[300px] rounded-lg overflow-hidden ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={uploading ? undefined : () => openLightbox(message.content, message.fileName, "video", message)}
          >
            {/* Video thumbnail — no native controls */}
            <video
              src={message.content}
              className="w-full rounded-lg"
              preload="metadata"
              muted
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 rounded-lg" />
            {/* Play button */}
            {!uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg
                              group-hover:scale-110 transition-transform">
                  <PlayArrow sx={{ fontSize: 28, color: '#333' }} />
                </div>
              </div>
            )}
            {/* Uploading spinner */}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="text-white text-xs font-medium">Sending...</span>
                </div>
              </div>
            )}
            {/* Duration badge (bottom-left) */}
            {message.metadata?.duration && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                {Math.floor(message.metadata.duration / 60)}:{String(Math.floor(message.metadata.duration % 60)).padStart(2, '0')}
              </div>
            )}
          </div>
        );
      case "text":
      default:
        return <p className="text-sm">{linkifyText(message.content, isSender)}</p>;
    }
  };

  const getDateLabel = (date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "dd/MM/yyyy");
  };

  return (
    <>
      {/* Scrollable message list */}
      <div
        className="flex-1 w-full  overflow-y-scroll px-4 pt-2 space-y-2 scrollbar-hide"
        style={{
          scrollbarColor: `${colors.third} transparent`,
          scrollbarWidth: "thin",
        }}
      >
        {messages.map((message, idx) => {
          const isSender = message.senderId === currentUserId;
          const uniqueKey = `${message.chatId || "chat"}-${message.id || idx}-${idx}`;

          // Date separator
          const msgDate = new Date(message.timestamp);
          const prevDate = idx > 0 ? new Date(messages[idx - 1].timestamp) : null;
          const showDateSeparator = !prevDate || !isSameDay(msgDate, prevDate);

          return (
            <React.Fragment key={uniqueKey}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-light-text/10 dark:bg-dark-text/10" />
                  <span className="text-[11px] text-light-text/40 dark:text-dark-text/40 font-medium px-2">
                    {getDateLabel(msgDate)}
                  </span>
                  <div className="flex-1 h-px bg-light-text/10 dark:bg-dark-text/10" />
                </div>
              )}
              <div
                className={`group flex items-end ${
                  isSender ? "justify-end" : "justify-start"
                } ${selectionMode ? "cursor-pointer" : ""} ${
                  selectionMode && selectedIds.has(message.id) ? "bg-blue-500/10 dark:bg-blue-400/10 -mx-2 px-2 rounded-lg" : ""
                }`}
                data-message-id={message.id}
                data-unread={!isSender && message.status !== "seen"}
                onClick={selectionMode && message.id ? () => onToggleSelect(message.id) : undefined}
              >
                {/* Selection checkbox (left side) */}
                {selectionMode && (
                  <div className="flex items-center mr-2 mb-1 flex-shrink-0">
                    {selectedIds.has(message.id) ? (
                      <CheckCircle sx={{ fontSize: 22, color: colors.third }} />
                    ) : (
                      <RadioButtonUnchecked sx={{ fontSize: 22, color: '#9e9e9e' }} />
                    )}
                  </div>
                )}

                {!selectionMode && !isSender && (
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

                {/* Three-dot menu before bubble (sender side) — hidden in selection mode */}
                {!selectionMode && isSender && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 mr-1">
                    <MessageActionMenu items={getBubbleMenuItems(message, true)} />
                  </div>
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
                      {renderMessageContent(message, isSender)}
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

                {/* Three-dot menu after bubble (receiver side) — hidden in selection mode */}
                {!selectionMode && !isSender && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 ml-1">
                    <MessageActionMenu items={getBubbleMenuItems(message, false)} />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10">
            <span className="text-white/70 text-sm truncate max-w-[60%]">
              {lightbox.fileName || ""}
            </span>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <MessageActionMenu
                items={getLightboxMenuItems()}
                iconSize={20}
                iconColor="white"
              />
              <button
                onClick={closeLightbox}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          {/* Media content */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[92%] h-[80%] flex items-center justify-center"
          >
            {lightbox.type === "video" ? (
              <video
                src={lightbox.src}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={lightbox.src}
                alt={lightbox.fileName || "Image"}
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Message details dialog */}
      <MessageDetailsDialog
        open={!!detailsMessage}
        onClose={() => setDetailsMessage(null)}
        message={detailsMessage}
        currentUserId={currentUserId}
        otherUserName={otherUserName}
      />
    </>
  );
};

export default MessageList;
