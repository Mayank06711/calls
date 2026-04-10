import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import dayjs from 'dayjs';
import { SendOutlined, LockOutlined } from '@mui/icons-material';
import { useSocketContext } from '../../../../socket/SocketContext';
import { SOCKET_CONSTANTS } from '../../../../constants/socketContanst';
import { fetchBookingChat, sendBookingChatMessage } from '../../../../redux/thunks/booking.thunks';
import { addBookingChatMessage } from '../../../../redux/actions/booking.actions';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { toRgba } from '../../../../utils/getSubscriptionColors';

const BookingChat = ({ bookingId, colors }) => {
  const dispatch = useDispatch();
  const { socket } = useSocketContext();

  const messages = useSelector((state) => state.booking?.bookingChatMessages || []);
  const chatWritable = useSelector((state) => state.booking?.chatWritable || false);
  const currentUserId = useSelector((state) => state.auth?.userInfo?._id);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.BOOKING_CHAT]);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Fetch chat messages on mount
  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingChat(bookingId));
    }
  }, [bookingId, dispatch]);

  // Listen for real-time chat messages via socket
  useEffect(() => {
    if (!socket || !bookingId) return;
    const handler = (payload) => {
      if (payload?.data?.bookingId === bookingId && payload?.data?.message) {
        dispatch(addBookingChatMessage(payload.data.message));
      }
    };
    socket.on(SOCKET_CONSTANTS.BOOKING.CHAT_MESSAGE, handler);
    return () => socket.off(SOCKET_CONSTANTS.BOOKING.CHAT_MESSAGE, handler);
  }, [socket, bookingId, dispatch]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !chatWritable) return;

    setSending(true);
    setText('');
    await dispatch(sendBookingChatMessage(bookingId, trimmed));
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"
        style={{ backgroundColor: toRgba(colors.fourth, 0.05) }}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text">
          Session Chat
        </h3>
      </div>

      {/* Messages Area */}
      <div
        ref={containerRef}
        className="h-[400px] overflow-y-auto px-4 py-3 space-y-3"
        style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: colors.fourth }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender === currentUserId || msg.sender?._id === currentUserId;
            return (
              <div
                key={msg._id || idx}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl ${
                    isMine
                      ? 'rounded-br-md text-white'
                      : 'rounded-bl-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-dark-text'
                  }`}
                  style={isMine ? { backgroundColor: colors.fourth } : {}}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {dayjs(msg.sentAt).format('h:mm A')}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {chatWritable ? (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-dark-text px-4 py-2.5 rounded-full text-sm border-none outline-none focus:ring-2"
            style={{ '--tw-ring-color': toRgba(colors.fourth, 0.3) }}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-2.5 rounded-full text-white transition-opacity disabled:opacity-40 hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            <SendOutlined sx={{ fontSize: 18 }} />
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
          <LockOutlined sx={{ fontSize: 16 }} />
          <span className="text-sm">Chat is read-only</span>
        </div>
      )}
    </div>
  );
};

export default BookingChat;
