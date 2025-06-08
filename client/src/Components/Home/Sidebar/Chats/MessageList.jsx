
import React, { useEffect, useRef } from 'react';
import MessageStatus from './MessageStatus';
import { format } from 'date-fns';

const MessageList = ({ messages, currentUserId, onMessageSeen }) => {
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);

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
        entries.forEach(entry => {
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

    // Observe all unread messages from other users
    document.querySelectorAll('.message-item[data-unread="true"]').forEach(
      element => observerRef.current.observe(element)
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderMessageContent = (message) => {
    switch (message.type) {
      case 'image':
        return (
          <div className="relative">
            <img
              src={message.content}
              alt={message.fileName || 'Image'}
              className="max-w-[300px] rounded-lg cursor-pointer"
              onClick={() => window.open(message.content, '_blank')}
            />
            {message.fileName && (
              <span className="text-xs text-gray-500 mt-1 block">
                {message.fileName}
              </span>
            )}
          </div>
        );
      case 'text':
      default:
        return <p className="text-sm">{message.content}</p>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isSender = message.senderId === currentUserId;
        
        return (
          <div
            key={message.id}
            className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
            data-message-id={message.id}
            data-unread={!isSender && message.status !== 'seen'}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                isSender 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {renderMessageContent(message)}
              
              <div className="flex items-center justify-end mt-1 space-x-1">
                <span className="text-xs opacity-70">
                  {format(new Date(message.timestamp), 'HH:mm')}
                </span>
                {isSender && (
                  <MessageStatus status={message.status} />
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