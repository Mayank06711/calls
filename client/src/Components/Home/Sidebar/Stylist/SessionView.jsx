import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowBack,
  ChatOutlined,
  AccessTimeOutlined,
  CloseOutlined,
} from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import {
  fetchBookingDetail,
  toggleBookingPermissions,
  fetchClientCloset,
  fetchClientOutfits,
} from '../../../../redux/thunks/booking.thunks';
import {
  clearBookingDetail,
  addSharedCatalogItem,
  addTryOnResult,
  updateTryOnResult,
  updateBookingEndTime,
  setInstantBookingStarted,
} from '../../../../redux/actions/booking.actions';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { useSocketContext } from '../../../../socket/SocketContext';
import ChatService from '../../../../socket/chatService';
import { SOCKET_CONSTANTS } from '../../../../constants/socketContanst';

// Session sub-components (shared with BookingDetail)
import {
  PersonInfoCard,
  BookingInfoCard,
  PermissionTogglesCard,
  ExpertTabs,
  ExpertTabContent,
} from './BookingComponents';
import SharedRecommendations from './SharedRecommendations';
import CatalogItemModal from './CatalogItemModal';
import TryOnModal from './TryOnModal';
import TryOnResults from './TryOnResults';
import SessionCountdownTimer from './SessionCountdownTimer';

// Chat components (reuse existing ChatArea)
import ChatArea from '../Chats/ChatArea';

const SessionView = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { bookingId } = useParams();
  const colors = useSubscriptionColors();
  const { socket } = useSocketContext();

  // ─── Booking / session state ──────────────────────────────────────────────
  const detail = useSelector((state) => state.booking?.bookingDetail);
  const clientCloset = useSelector((state) => state.booking?.clientCloset || []);
  const clientOutfits = useSelector((state) => state.booking?.clientOutfits || []);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.BOOKING_DETAIL]);
  const isClosetLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.CLIENT_CLOSET]);
  const isOutfitsLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.CLIENT_OUTFITS]);
  const sharedCatalogItems = useSelector((state) => state.booking?.sharedCatalogItems || []);
  const tryOnResults = useSelector((state) => state.booking?.tryOnResults || []);
  const currentUserId = useSelector((state) => state.auth?.userId);
  // Socket readiness — must wait for authentication before creating ChatService
  const socketConnected = useSelector((state) => state.socketMetrics?.connected);
  const socketAuthenticated = useSelector((state) => state.socketMetrics?.authenticated);

  const [activeTab, setActiveTab] = useState('profile');
  const [togglingPerm, setTogglingPerm] = useState(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [tryOnItem, setTryOnItem] = useState(null);
  const [tryOnFullImage, setTryOnFullImage] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Reset sessionExpired when endTime changes (e.g. after extension)
  useEffect(() => {
    if (detail?.booking?.endTime) {
      setSessionExpired(false);
    }
  }, [detail?.booking?.endTime]);

  // ─── Chat state ───────────────────────────────────────────────────────────
  const chatServiceRef = useRef(null);
  const processedDeliveredAcks = useRef(new Set());
  const [chatVisible, setChatVisible] = useState(true); // mobile toggle — show chat by default
  const [chatReady, setChatReady] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingDetail(bookingId));
    }
    return () => dispatch(clearBookingDetail());
  }, [bookingId, dispatch]);

  // Socket: catalog item shared
  useEffect(() => {
    if (!socket || !bookingId) return;
    const handler = (payload) => {
      if (payload?.data?.bookingId === bookingId) {
        dispatch(addSharedCatalogItem(payload.data.sharedItem));
      }
    };
    socket.on('booking:catalog-item-shared', handler);
    return () => socket.off('booking:catalog-item-shared', handler);
  }, [socket, bookingId, dispatch]);

  // Socket: try-on events
  useEffect(() => {
    if (!socket || !bookingId) return;
    const handleTryOnRequested = (payload) => {
      if (payload?.data?.bookingId === bookingId && payload?.data?.tryOnResult) {
        dispatch(addTryOnResult(payload.data.tryOnResult));
      }
    };
    const handleTryOnResult = (payload) => {
      if (payload?.data?.bookingId === bookingId && payload?.data?.resultId) {
        dispatch(updateTryOnResult(payload.data.resultId, payload.data.updates));
      }
    };
    socket.on(SOCKET_CONSTANTS.BOOKING.TRYON_REQUESTED, handleTryOnRequested);
    socket.on(SOCKET_CONSTANTS.BOOKING.TRYON_RESULT, handleTryOnResult);
    return () => {
      socket.off(SOCKET_CONSTANTS.BOOKING.TRYON_REQUESTED, handleTryOnRequested);
      socket.off(SOCKET_CONSTANTS.BOOKING.TRYON_RESULT, handleTryOnResult);
    };
  }, [socket, bookingId, dispatch]);

  // Socket: session extension
  useEffect(() => {
    if (!socket || !bookingId) return;
    const handleSessionExtended = (payload) => {
      if (payload?.data?.bookingId === bookingId) {
        dispatch(updateBookingEndTime({
          newEndTime: payload.data.newEndTime,
          newDuration: payload.data.newDuration,
          extensionMinutes: payload.data.extensionMinutes,
          totalCreditsCharged: payload.data.totalCreditsCharged,
          totalExtendedMinutes: payload.data.totalExtendedMinutes,
        }));
      }
    };
    socket.on(SOCKET_CONSTANTS.BOOKING.SESSION_EXTENDED, handleSessionExtended);
    return () => socket.off(SOCKET_CONSTANTS.BOOKING.SESSION_EXTENDED, handleSessionExtended);
  }, [socket, bookingId, dispatch]);

  // Socket: instant booking started (expert typed "start")
  useEffect(() => {
    if (!socket || !bookingId) return;
    const handler = (payload) => {
      if (payload?.data?.bookingId === bookingId) {
        dispatch(setInstantBookingStarted(payload.data));
      }
    };
    socket.on(SOCKET_CONSTANTS.BOOKING.INSTANT_STARTED, handler);
    return () => socket.off(SOCKET_CONSTANTS.BOOKING.INSTANT_STARTED, handler);
  }, [socket, bookingId, dispatch]);

  // Expert tabs — fetch closet / outfits when tab changes
  // Always attempt the fetch (even if local permissions say locked) so that
  // newly-granted permissions are picked up without a page refresh.
  // The thunk handles 403 → sets permissions to false; success → sets to true.
  useEffect(() => {
    if (!detail || detail.role !== 'expert') return;
    if (activeTab === 'closet') {
      dispatch(fetchClientCloset(bookingId));
    }
    if (activeTab === 'outfits') {
      dispatch(fetchClientOutfits(bookingId));
    }
  }, [activeTab, bookingId, dispatch, detail?.role]);

  // ─── ChatService initialisation ───────────────────────────────────────────

  // Create ChatService instance only after socket is connected AND authenticated
  // (matches Chats.jsx which gates ChatArea behind connected && authenticated)
  useEffect(() => {
    if (socket && socketConnected && socketAuthenticated && !chatServiceRef.current) {
      chatServiceRef.current = new ChatService(socket);
      setChatReady(true);
    }
  }, [socket, socketConnected, socketAuthenticated]);

  // Global message listener — delivers ack for incoming real-time messages
  useEffect(() => {
    if (!chatReady || !chatServiceRef.current) return;

    const handleNewMessage = (message) => {
      const msgData = message.data || message;
      const senderId = msgData.senderId;
      const messageId = msgData.messageId || msgData.id;
      const chatId = msgData.chatId;
      const isHistoryLoad = msgData.isHistoryLoad || message.isHistoryLoad;
      const isOwnMessage = senderId === currentUserId;
      const ackKey = `${chatId}-${messageId}`;
      const alreadyProcessed = processedDeliveredAcks.current.has(ackKey);

      if (!isHistoryLoad && !isOwnMessage && !alreadyProcessed && messageId && chatId && chatServiceRef.current) {
        processedDeliveredAcks.current.add(ackKey);
        setTimeout(() => processedDeliveredAcks.current.delete(ackKey), 60000);
        chatServiceRef.current.markMessageAsDelivered(chatId, messageId)
          .catch((err) => console.error('Failed to send delivered-ack:', err));
      }
    };

    chatServiceRef.current.addMessageListener(handleNewMessage);

    return () => {
      if (chatServiceRef.current) {
        chatServiceRef.current.removeMessageListener();
      }
    };
  }, [chatReady, currentUserId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTogglePermission = useCallback(async (perm) => {
    if (!detail) return;
    setTogglingPerm(perm);
    const newValue = !detail.permissions[perm];
    await dispatch(toggleBookingPermissions(bookingId, { [perm]: newValue }));
    setTogglingPerm(null);
  }, [detail, bookingId, dispatch]);

  const goBack = () => navigate(-1);

  // ─── Derived data ─────────────────────────────────────────────────────────

  const role = detail?.role;
  const isUser = role === 'user';
  const isExpert = role === 'expert';
  const booking = detail?.booking;
  const permissions = detail?.permissions;
  // Server snapshot + client-side timer expiry — once timer hits 0, lock session UI
  const sessionActive = detail?.sessionActive && !sessionExpired;

  // Construct selectedUser for ChatArea from booking detail
  const selectedUser = React.useMemo(() => {
    if (!detail) return null;
    const person = isUser ? detail.expert : detail.client;
    if (!person) return null;
    return {
      _id: person._id,
      fullName: person.fullName,
      username: person.username,
      profilePhoto: person.profilePhoto?.url || person.profilePhoto?.thumbnail_url,
      isExpert: isUser, // the other person is expert when current user is the "user" role
    };
  }, [detail, isUser]);

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoading || !detail) {
    return (
      <div className="flex h-full items-center justify-center bg-light-secondary dark:bg-dark-secondary">
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-light-secondary dark:bg-dark-secondary">
      {/* ─── Session Panel (left) ────────────────────────────────────────── */}
      <div
        className={`${
          chatVisible ? 'hidden lg:flex' : 'flex'
        } w-full lg:w-[420px] flex-col border-r border-gray-200 dark:border-gray-700 bg-light-secondary dark:bg-dark-secondary`}
      >
        {/* Session Panel Header */}
        <div className="px-4 py-3 shadow-sm flex items-center gap-3" style={{ backgroundColor: colors.fourth }}>
          <button onClick={goBack} className="text-white hover:opacity-80 transition-opacity">
            <ArrowBack />
          </button>
          <h1 className="text-lg font-semibold text-white flex-grow truncate">
            {isUser ? 'Session' : 'Client Session'}
          </h1>
          {/* Mobile: show chat toggle */}
          <button
            onClick={() => setChatVisible(true)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <ChatOutlined sx={{ fontSize: 16 }} />
            Chat
          </button>
        </div>

        {/* Session Panel Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Instant booking: waiting for expert to type "start" */}
          {booking?.isInstant && !booking?.startedAt && booking?.connectedAt && (
            <div
              className="rounded-lg p-4 flex items-center gap-3"
              style={{
                backgroundColor: `${colors.fourth}15`,
                border: `1px solid ${colors.fourth}30`,
              }}
            >
              <div
                className="animate-pulse h-3 w-3 rounded-full"
                style={{ backgroundColor: colors.fourth }}
              />
              <p className="text-sm dark:text-dark-text text-light-text">
                {isExpert
                  ? 'Type "start" in the chat to begin the session timer.'
                  : 'Waiting for expert to start the session...'}
              </p>
            </div>
          )}

          {/* Session Countdown Timer — only show when session has truly started */}
          {detail?.sessionActive && booking?.connectedAt && (!booking?.isInstant || booking?.startedAt) && (
            <SessionCountdownTimer
              booking={booking}
              role={role}
              colors={colors}
              onSessionEnd={() => setSessionExpired(true)}
            />
          )}

          {/* Session Ended Banner */}
          {!sessionActive && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
              <AccessTimeOutlined className="text-amber-600 dark:text-amber-400" sx={{ fontSize: 20 }} />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {booking?.status === 'cancelled'
                  ? 'This booking was cancelled.'
                  : 'This session has ended.'}
              </p>
            </div>
          )}

          {/* Person Info */}
          <PersonInfoCard detail={detail} colors={colors} />

          {/* Booking Info */}
          <BookingInfoCard booking={booking} isUser={isUser} colors={colors} />

          {/* User: Permission Toggles */}
          {isUser && sessionActive && (
            <PermissionTogglesCard
              permissions={permissions}
              onToggle={handleTogglePermission}
              togglingPerm={togglingPerm}
              colors={colors}
            />
          )}

          {/* Expert: Tabbed sections */}
          {isExpert && (
            <>
              <ExpertTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                permissions={permissions}
                sessionActive={sessionActive}
                colors={colors}
              />
              <ExpertTabContent
                activeTab={activeTab}
                detail={detail}
                bookingId={bookingId}
                clientCloset={clientCloset}
                clientOutfits={clientOutfits}
                permissions={permissions}
                sessionActive={sessionActive}
                colors={colors}
                onTryOn={(item) => setTryOnItem(item)}
                isClosetLoading={isClosetLoading}
                isOutfitsLoading={isOutfitsLoading}
              />
            </>
          )}

          {/* Shared Recommendations (both roles) */}
          {sharedCatalogItems.length > 0 && (
            <SharedRecommendations
              sharedItems={sharedCatalogItems}
              role={role}
              colors={colors}
              onItemClick={(item) => setSelectedCatalogItem(item)}
              onTryOn={(item) => setTryOnItem(item)}
            />
          )}

          {/* Virtual Try-On Results (both roles) */}
          {tryOnResults.length > 0 && (
            <TryOnResults
              results={tryOnResults}
              colors={colors}
              onImageClick={setTryOnFullImage}
            />
          )}
        </div>
      </div>

      {/* ─── Chat Area (right) ───────────────────────────────────────────── */}
      <div
        className={`${
          !chatVisible ? 'hidden lg:flex' : 'flex'
        } flex-1 flex-col h-full min-w-0`}
      >
        {selectedUser && chatReady ? (
          <ChatArea
            selectedUser={selectedUser}
            chatServiceRef={chatServiceRef}
            onBack={() => setChatVisible(false)} // mobile: back to session panel
            isExpert={isExpert}
            bookingId={bookingId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Loading chat...</p>
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Catalog Item Detail Modal */}
      {selectedCatalogItem && (
        <CatalogItemModal
          item={selectedCatalogItem.catalogItem}
          note={selectedCatalogItem.note}
          onClose={() => setSelectedCatalogItem(null)}
          colors={colors}
        />
      )}

      {/* Virtual Try-On Modal */}
      {tryOnItem && (
        <TryOnModal
          item={tryOnItem}
          bookingId={bookingId}
          role={role}
          clientPhotos={isExpert ? detail?.client?.allPhotos || [] : detail?.myPhotos || []}
          colors={colors}
          onClose={() => setTryOnItem(null)}
        />
      )}

      {/* Try-On Fullscreen Image Viewer */}
      {tryOnFullImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setTryOnFullImage(null)}
        >
          <button
            onClick={() => setTryOnFullImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <CloseOutlined sx={{ fontSize: 28 }} />
          </button>
          <img
            src={tryOnFullImage}
            alt="Try-On Result"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

export default SessionView;
