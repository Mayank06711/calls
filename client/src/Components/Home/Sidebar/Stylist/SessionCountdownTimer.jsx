import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { AccessTimeOutlined } from '@mui/icons-material';
import { extendSession } from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';

dayjs.extend(utc);
dayjs.extend(timezone);

const EXTENSION_OPTIONS = [
  { minutes: 2, label: '+2 min' },
  { minutes: 5, label: '+5 min' },
  { minutes: 10, label: '+10 min' },
];

const MAX_EXTENSION_MINUTES = 30;

const SessionCountdownTimer = ({ booking, role, colors, onSessionEnd }) => {
  const dispatch = useDispatch();
  const creditBalance = useSelector((state) => state.booking?.creditBalance || 0);
  const isExtending = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.EXTEND_SESSION]);

  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const hasNotifiedEnd = useRef(false);

  // Calculate remaining seconds — updates every second
  useEffect(() => {
    if (!booking?.endTime || !booking?.date) return;

    // Reset end-notification flag when endTime changes (e.g. after extension)
    hasNotifiedEnd.current = false;

    const tz = booking.timezone || 'Asia/Kolkata';
    const dateStr = dayjs(booking.date).tz(tz).format('YYYY-MM-DD');

    const tick = () => {
      const sessionEnd = dayjs.tz(`${dateStr} ${booking.endTime}`, 'YYYY-MM-DD HH:mm', tz);
      const now = dayjs();
      const diff = sessionEnd.diff(now, 'second');
      setRemainingSeconds(Math.max(0, diff));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [booking?.endTime, booking?.date, booking?.timezone]);

  // Notify parent when timer reaches 0 — fires exactly once per endTime
  useEffect(() => {
    if (remainingSeconds !== null && remainingSeconds <= 0 && !hasNotifiedEnd.current && onSessionEnd) {
      hasNotifiedEnd.current = true;
      onSessionEnd();
    }
  }, [remainingSeconds, onSessionEnd]);

  const handleExtend = useCallback(async (minutes) => {
    await dispatch(extendSession(booking._id, minutes));
  }, [dispatch, booking?._id]);

  if (remainingSeconds === null) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color thresholds
  const isWarning = remainingSeconds <= 300; // <= 5 min
  const isCritical = remainingSeconds <= 120; // <= 2 min
  const isExpired = remainingSeconds <= 0;

  const timerColor = isExpired || isCritical
    ? '#EF4444'
    : isWarning
    ? '#F59E0B'
    : '#10B981';

  const bgColor = isExpired || isCritical
    ? 'rgba(239,68,68,0.1)'
    : isWarning
    ? 'rgba(245,158,11,0.1)'
    : 'rgba(16,185,129,0.1)';

  const showExtensionButtons = isCritical && role === 'user' && !isExpired;
  const creditRatePerMinute = booking.creditRatePerMinute || 0;
  const totalExtended = booking.totalExtendedMinutes || 0;
  const remainingExtensionBudget = MAX_EXTENSION_MINUTES - totalExtended;

  return (
    <div
      className="mx-6 mt-2 rounded-xl p-4 border transition-colors duration-300"
      style={{ backgroundColor: bgColor, borderColor: timerColor + '33' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AccessTimeOutlined style={{ color: timerColor, fontSize: 22 }} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isExpired ? 'Session ended' : 'Time remaining'}
          </span>
        </div>
        <span
          className="text-2xl font-bold font-mono tracking-wider"
          style={{ color: timerColor }}
        >
          {formattedTime}
        </span>
      </div>

      {/* Extension buttons — user only, when <= 2 min remaining */}
      {showExtensionButtons && creditRatePerMinute > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: timerColor + '22' }}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Extend session ({remainingExtensionBudget} min remaining of {MAX_EXTENSION_MINUTES} max)
          </p>
          <div className="flex gap-2">
            {EXTENSION_OPTIONS.map((opt) => {
              const cost = creditRatePerMinute * opt.minutes;
              const canAfford = creditBalance >= cost;
              const withinCap = opt.minutes <= remainingExtensionBudget;
              const disabled = !canAfford || !withinCap || isExtending;

              return (
                <button
                  key={opt.minutes}
                  onClick={() => handleExtend(opt.minutes)}
                  disabled={disabled}
                  className="flex-1 flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                  style={{
                    backgroundColor: disabled ? 'rgba(156,163,175,0.1)' : colors.fourth + '15',
                    color: disabled ? '#9ca3af' : colors.fourth,
                    border: `1px solid ${disabled ? 'transparent' : colors.fourth + '30'}`,
                  }}
                >
                  <span className="font-semibold">{opt.label}</span>
                  <span className="text-[10px] opacity-70">{cost} credits</span>
                </button>
              );
            })}
          </div>
          {creditBalance < creditRatePerMinute * 2 && (
            <p className="text-xs text-red-500 mt-1.5">
              Low credit balance ({creditBalance} credits)
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionCountdownTimer;
