import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  CloseOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
  TodayOutlined,
} from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';

dayjs.extend(isoWeek);

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getBlockColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300';
    case 'completed':
      return 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300';
    case 'cancelled':
      return 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300';
    default:
      return 'bg-gray-100 dark:bg-gray-800/40 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-400';
  }
};

const WeeklyCalendarModal = ({ open, onClose, bookings, colors }) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    dayjs().startOf('isoWeek')
  );

  const goToPrevWeek = () => setCurrentWeekStart((prev) => prev.subtract(7, 'day'));
  const goToNextWeek = () => setCurrentWeekStart((prev) => prev.add(7, 'day'));
  const goToThisWeek = () => setCurrentWeekStart(dayjs().startOf('isoWeek'));

  const allBookings = useMemo(() => {
    return [...(bookings?.upcoming || []), ...(bookings?.past || [])];
  }, [bookings]);

  const weekEnd = useMemo(
    () => currentWeekStart.add(6, 'day').endOf('day'),
    [currentWeekStart]
  );

  const weekBookings = useMemo(() => {
    const grouped = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    allBookings.forEach((b) => {
      if (!b?.date || !b?.startTime) return;
      const bDay = dayjs(b.date);
      if (
        (bDay.isSame(currentWeekStart, 'day') || bDay.isAfter(currentWeekStart)) &&
        (bDay.isSame(weekEnd, 'day') || bDay.isBefore(weekEnd))
      ) {
        const isoDay = bDay.isoWeekday(); // 1=Mon, 7=Sun
        if (grouped[isoDay]) {
          grouped[isoDay].push(b);
        }
      }
    });

    Object.values(grouped).forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    );

    return grouped;
  }, [allBookings, currentWeekStart, weekEnd]);

  const isThisWeek = currentWeekStart.isSame(dayjs().startOf('isoWeek'), 'day');

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-dark-primary shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={goToPrevWeek}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
              >
                <ChevronLeftOutlined />
              </button>

              <div className="text-center flex-grow">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                  Weekly Calendar
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentWeekStart.format('MMM D')} –{' '}
                  {currentWeekStart.add(6, 'day').format('MMM D, YYYY')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isThisWeek && (
                  <button
                    onClick={goToThisWeek}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: toRgba(colors.fourth, 0.1),
                      color: colors.fourth,
                    }}
                  >
                    <TodayOutlined sx={{ fontSize: 14 }} />
                    Today
                  </button>
                )}
                <button
                  onClick={goToNextWeek}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                >
                  <ChevronRightOutlined />
                </button>
              </div>

              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <CloseOutlined sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* 7-column Grid */}
            <div className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-7 gap-2 min-h-[400px] min-w-[650px]">
                {[1, 2, 3, 4, 5, 6, 7].map((isoDay) => {
                  const dayDate = currentWeekStart.isoWeekday(isoDay);
                  const isToday = dayDate.isSame(dayjs(), 'day');
                  const dayBookings = weekBookings[isoDay] || [];

                  return (
                    <div
                      key={isoDay}
                      className={`flex flex-col rounded-lg overflow-hidden ${
                        isToday
                          ? 'border-2 shadow-sm'
                          : 'border border-gray-200 dark:border-gray-700'
                      }`}
                      style={isToday ? { borderColor: colors.fourth } : {}}
                    >
                      {/* Day Header */}
                      <div
                        className={`text-center py-2 px-1 ${
                          isToday
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
                        }`}
                        style={isToday ? { backgroundColor: colors.fourth } : {}}
                      >
                        <div className="text-xs font-medium">
                          {DAY_LABELS[isoDay - 1]}
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            isToday
                              ? 'text-white'
                              : 'text-gray-900 dark:text-dark-text'
                          }`}
                        >
                          {dayDate.format('D')}
                        </div>
                      </div>

                      {/* Booking Blocks */}
                      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto bg-white dark:bg-dark-primary">
                        {dayBookings.length === 0 ? (
                          <div className="text-center py-6 text-gray-300 dark:text-gray-600 text-xs">
                            —
                          </div>
                        ) : (
                          dayBookings.map((booking) => (
                            <div
                              key={booking._id}
                              className={`p-2 rounded-md border text-xs ${getBlockColor(
                                booking.status
                              )}`}
                            >
                              <div className="font-semibold truncate">
                                {booking.startTime} – {booking.endTime}
                              </div>
                              <div className="truncate opacity-80 mt-0.5">
                                {booking.user?.fullName || 'Client'}
                              </div>
                              <div className="text-[10px] opacity-60 mt-0.5">
                                {booking.duration}min
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800 border border-green-400 dark:border-green-600" />
                <span className="text-gray-600 dark:text-gray-400">Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800 border border-blue-400 dark:border-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800 border border-red-400 dark:border-red-600" />
                <span className="text-gray-600 dark:text-gray-400">Cancelled</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WeeklyCalendarModal;
