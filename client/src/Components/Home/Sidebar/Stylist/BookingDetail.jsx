import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowBack,
  AccessTimeOutlined,
  VideocamOutlined,
  CancelOutlined,
  CloseOutlined,
} from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import {
  fetchBookingDetail,
  toggleBookingPermissions,
  connectBooking,
  cancelBooking,
  fetchMyBookings,
  fetchExpertBookings,
  fetchClientCloset,
  fetchClientOutfits,
} from '../../../../redux/thunks/booking.thunks';
import { clearBookingDetail, addSharedCatalogItem, addTryOnResult, updateTryOnResult, updateBookingEndTime } from '../../../../redux/actions/booking.actions';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { useSocketContext } from '../../../../socket/SocketContext';
import SharedRecommendations from './SharedRecommendations';
import CatalogItemModal from './CatalogItemModal';
import TryOnModal from './TryOnModal';
import TryOnResults from './TryOnResults';
import SessionCountdownTimer from './SessionCountdownTimer';
import { PersonInfoCard, BookingInfoCard, PermissionTogglesCard, ExpertTabs, ExpertTabContent } from './BookingComponents';
import { SOCKET_CONSTANTS } from '../../../../constants/socketContanst';

// ─── Main Component ─────────────────────────────────────────────────────────

const BookingDetail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { bookingId } = useParams();
  const colors = useSubscriptionColors();
  const { socket } = useSocketContext();

  const detail = useSelector((state) => state.booking?.bookingDetail);
  const clientCloset = useSelector((state) => state.booking?.clientCloset || []);
  const clientOutfits = useSelector((state) => state.booking?.clientOutfits || []);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.BOOKING_DETAIL]);
  const isClosetLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.CLIENT_CLOSET]);
  const isOutfitsLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.CLIENT_OUTFITS]);
  const sharedCatalogItems = useSelector((state) => state.booking?.sharedCatalogItems || []);
  const tryOnResults = useSelector((state) => state.booking?.tryOnResults || []);

  const [activeTab, setActiveTab] = useState('profile');
  const [togglingPerm, setTogglingPerm] = useState(null); // 'closet' | 'outfits' | null
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

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingDetail(bookingId));
    }
    return () => dispatch(clearBookingDetail());
  }, [bookingId, dispatch]);

  // Listen for real-time catalog item shares via socket
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

  // Listen for real-time try-on events via socket
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

  // Listen for real-time session extension via socket
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

  // Fetch client data when expert tabs change.
  // Always attempt fetch (even if local permissions say locked) so that
  // newly-granted permissions are picked up without a page refresh.
  useEffect(() => {
    if (!detail || detail.role !== 'expert') return;
    if (activeTab === 'closet') {
      dispatch(fetchClientCloset(bookingId));
    }
    if (activeTab === 'outfits') {
      dispatch(fetchClientOutfits(bookingId));
    }
  }, [activeTab, bookingId, dispatch, detail?.role]);

  const handleTogglePermission = useCallback(async (perm) => {
    if (!detail) return;
    setTogglingPerm(perm);
    const newValue = !detail.permissions[perm];
    await dispatch(toggleBookingPermissions(bookingId, { [perm]: newValue }));
    setTogglingPerm(null);
  }, [detail, bookingId, dispatch]);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectBooking(bookingId));
      if (result) {
        navigate(`/session/${bookingId}`);
      }
    } catch (error) {
      console.error('Failed to connect booking:', error);
    }
  };

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    dispatch(cancelBooking(bookingId, undefined, () => {
      // Refresh both booking lists
      dispatch(fetchMyBookings());
      dispatch(fetchExpertBookings());
      navigate(-1);
    }));
  };

  const goBack = () => navigate(-1);

  if (isLoading || !detail) {
    return (
      <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
        <div className="sticky top-0 z-10">
          <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
            <div className="flex items-center gap-4">
              <button onClick={goBack} className="text-white hover:opacity-80 transition-opacity">
                <ArrowBack />
              </button>
              <h1 className="text-xl font-semibold text-white">Loading...</h1>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const { booking, role, permissions } = detail;
  // Server snapshot + client-side timer expiry — once timer hits 0, lock session UI
  const sessionActive = detail.sessionActive && !sessionExpired;
  const isUser = role === 'user';
  const isExpert = role === 'expert';
  const isConfirmed = booking?.status === 'confirmed';

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="text-white hover:opacity-80 transition-opacity">
              <ArrowBack />
            </button>
            <h1 className="text-xl font-semibold text-white flex-grow">
              {isUser ? 'Booking Details' : 'Client Session'}
            </h1>
            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConfirmed
                  ? 'bg-green-100 text-green-800'
                  : booking?.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Session Countdown Timer — keep visible after expiry to show "Session ended" */}
      {detail.sessionActive && booking?.connectedAt && (
        <SessionCountdownTimer
          booking={booking}
          role={role}
          colors={colors}
          onSessionEnd={() => setSessionExpired(true)}
        />
      )}

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Session Ended Banner */}
        {!sessionActive && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
            <AccessTimeOutlined className="text-amber-600 dark:text-amber-400" sx={{ fontSize: 20 }} />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {booking?.status === 'cancelled'
                ? 'This booking was cancelled.'
                : 'This session has ended. Expert access has been revoked.'}
            </p>
          </div>
        )}

        {/* Person Info Card */}
        <PersonInfoCard detail={detail} colors={colors} />

        {/* Booking Info Card */}
        <BookingInfoCard booking={booking} isUser={isUser} colors={colors} />

        {/* User View: Permission Toggles (only for active sessions) */}
        {isUser && sessionActive && (
          <PermissionTogglesCard
            permissions={permissions}
            onToggle={handleTogglePermission}
            togglingPerm={togglingPerm}
            colors={colors}
          />
        )}

        {/* Expert View: Tabbed Data Sections */}
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

        {/* Action Buttons (only for active sessions) */}
        {sessionActive && (
          <div className="flex gap-4 pb-4">
            <button
              onClick={handleConnect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.fourth }}
            >
              <VideocamOutlined sx={{ fontSize: 20 }} />
              Connect
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-400 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <CancelOutlined sx={{ fontSize: 20 }} />
              Cancel
            </button>
          </div>
        )}
      </div>

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

export default BookingDetail;
