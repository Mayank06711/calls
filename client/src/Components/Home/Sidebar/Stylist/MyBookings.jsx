import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import {
  ArrowBack,
  CalendarMonthOutlined,
  AccessTimeOutlined,
  PersonOutlined,
  VideocamOutlined,
  CancelOutlined,
  EditCalendarOutlined,
} from '@mui/icons-material';
import { fetchMyBookings, cancelBooking, connectBooking } from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { useSocketContext } from '../../../../socket/SocketContext';
import ChatService from '../../../../socket/chatService';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';

const MyBookings = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();
  const { socket } = useSocketContext();

  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [connectStates, setConnectStates] = useState({}); // bookingId -> {canConnect, countdown}

  const myBookings = useSelector((state) => state.booking?.myBookings || { upcoming: [], past: [] });
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.MY_BOOKINGS]);
  const isExpert = useSelector((state) => state.auth?.userInfo?.isExpert);

  const intervalRef = useRef(null);

  // Fetch bookings on mount
  useEffect(() => {
    dispatch(fetchMyBookings());
  }, [dispatch]);

  // Update connect states every 30 seconds
  const upcomingBookings = myBookings.upcoming;
  useEffect(() => {
    if (!Array.isArray(upcomingBookings) || upcomingBookings.length === 0) {
      setConnectStates({});
      return;
    }

    const updateConnectStates = () => {
      const newStates = {};

      upcomingBookings.forEach((booking) => {
        if (!booking?._id || !booking?.date || !booking?.startTime) return;
        try {
          const dateStr = dayjs(booking.date).format('YYYY-MM-DD');
          const startMs = dayjs(`${dateStr} ${booking.startTime}`).valueOf();
          if (isNaN(startMs)) return;
          const endMs = startMs + (booking.duration || 30) * 60000;
          const connectStart = startMs - 2 * 60000; // 2 min before
          const now = Date.now();

          if (now >= connectStart && now <= endMs) {
            newStates[booking._id] = { canConnect: true, countdown: null };
          } else if (now < connectStart) {
            const diffMs = connectStart - now;
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            newStates[booking._id] = {
              canConnect: false,
              countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
            };
          } else {
            newStates[booking._id] = { canConnect: false, countdown: null };
          }
        } catch (err) {
          console.warn("Error computing connect state for booking:", booking._id, err);
        }
      });

      setConnectStates(newStates);
    };

    updateConnectStates();
    intervalRef.current = setInterval(updateConnectStates, 30000); // Every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [upcomingBookings]);

  const handleConnect = async (booking) => {
    try {
      const result = await dispatch(connectBooking(booking._id));
      if (result) {
        const targetUserId = result.otherUserId || result.expertUserId;
        if (socket) {
          const service = new ChatService(socket);
          service.sendChatRequest(targetUserId);
        }
        navigate('/chats/' + targetUserId);
      }
    } catch (error) {
      console.error('Failed to connect booking:', error);
    }
  };

  const handleCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      dispatch(cancelBooking(bookingId, null, () => dispatch(fetchMyBookings())));
    }
  };

  const canShowCancel = (booking) => {
    if (!booking?.date || !booking?.startTime) return false;
    try {
      const dateStr = dayjs(booking.date).format('YYYY-MM-DD');
      const startMs = dayjs(`${dateStr} ${booking.startTime}`).valueOf();
      if (isNaN(startMs)) return false;
      const twoHoursBeforeMs = startMs - 2 * 60 * 60 * 1000;
      return Date.now() < twoHoursBeforeMs;
    } catch {
      return false;
    }
  };

  const formatDate = (date) => {
    return dayjs(date).format('ddd, MMM D');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const renderBookingCard = (booking) => {
    const expertUser = booking.expertUser || {};
    const connectState = connectStates[booking._id] || {};
    const isUpcoming = activeTab === 'upcoming';

    return (
      <motion.div
        key={booking._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate(`/stylist/booking/${booking._id}`)}
        className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex gap-4">
          {/* Expert Photo */}
          <div className="flex-shrink-0">
            {expertUser.profilePhotoId ? (
              <img
                src={expertUser.profilePhotoId}
                alt={expertUser.fullName || 'Expert'}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: toRgba(colors.fourth, 0.8) }}
              >
                {getInitials(expertUser.fullName)}
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="flex-grow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                  {expertUser.fullName || 'Unknown Expert'}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <div className="flex items-center gap-1">
                    <CalendarMonthOutlined sx={{ fontSize: 16 }} />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AccessTimeOutlined sx={{ fontSize: 16 }} />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                {booking.status || 'Pending'}
              </span>
            </div>

            {/* Duration & Credits */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1 text-sm">
                <AccessTimeOutlined sx={{ fontSize: 16, color: colors.fourth }} />
                <span className="text-gray-700 dark:text-gray-300">{booking.duration} min</span>
              </div>
              <div className="text-sm">
                <span
                  className="font-medium"
                  style={{ color: colors.fourth }}
                >
                  {booking.creditsCharged} credits
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {isUpcoming && booking.status?.toLowerCase() !== 'cancelled' && (
              <div className="flex gap-2">
                {/* Connect Button */}
                {connectState.canConnect ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleConnect(booking); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    <VideocamOutlined sx={{ fontSize: 18 }} />
                    Connect
                  </button>
                ) : connectState.countdown ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm">
                    <AccessTimeOutlined sx={{ fontSize: 16 }} />
                    Connect in {connectState.countdown}
                  </div>
                ) : null}

                {/* Cancel Button */}
                {canShowCancel(booking) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancel(booking._id); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-all hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <CancelOutlined sx={{ fontSize: 18 }} />
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSkeletonCard = (index) => (
    <div
      key={`skeleton-${index}`}
      className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-3 animate-pulse"
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-grow">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
    >
      <CalendarMonthOutlined sx={{ fontSize: 64, opacity: 0.3, marginBottom: 2 }} />
      <p className="text-lg">
        {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
      </p>
    </motion.div>
  );

  const currentBookings = Array.isArray(activeTab === 'upcoming' ? myBookings.upcoming : myBookings.past)
    ? (activeTab === 'upcoming' ? myBookings.upcoming : myBookings.past)
    : [];

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Header + Tabs — sticky together */}
      <div className="sticky top-0 z-10">
        {/* Header */}
        <div
          className="px-6 py-4 shadow-sm"
          style={{ backgroundColor: colors.fourth }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/stylist')}
              className="text-white hover:opacity-80 transition-opacity"
            >
              <ArrowBack />
            </button>
            <h1 className="text-xl font-semibold text-white flex-grow">My Bookings</h1>
            {isExpert && (
              <button
                onClick={() => navigate('/expert-schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors"
              >
                <EditCalendarOutlined sx={{ fontSize: 16 }} />
                My Schedule
              </button>
            )}
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="px-6 py-3 bg-light-secondary dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 bg-gray-100 dark:bg-dark-primary p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'upcoming'
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              style={activeTab === 'upcoming' ? { backgroundColor: colors.fourth } : {}}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'past'
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              style={activeTab === 'past' ? { backgroundColor: colors.fourth } : {}}
            >
              Past
            </button>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <>
            {renderSkeletonCard(1)}
            {renderSkeletonCard(2)}
            {renderSkeletonCard(3)}
          </>
        ) : currentBookings && currentBookings.length > 0 ? (
          currentBookings.map(renderBookingCard)
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default MyBookings;
