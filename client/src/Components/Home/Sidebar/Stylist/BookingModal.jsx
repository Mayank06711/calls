import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  CloseOutlined,
  AccessTimeOutlined,
  CalendarMonthOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import {
  fetchAvailableSlots,
  createBooking,
} from '../../../../redux/thunks/booking.thunks';
import { clearAvailableSlots } from '../../../../redux/actions/booking.actions';
import { LOADER_TYPES } from '../../../../redux/action_creators';

// Format date as YYYY-MM-DD using LOCAL timezone (not UTC)
// toISOString() converts to UTC which shifts dates for IST users
const toLocalDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const BookingModal = ({ open, onClose, expert, colors, initialDuration }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');

  const creditBalance = useSelector((state) => state.booking.creditBalance);
  const availableSlots = useSelector((state) => state.booking.availableSlots);
  const loadingSlots = useSelector(
    (state) => state.loaderState?.loaders?.[LOADER_TYPES.AVAILABLE_SLOTS]
  );
  const loadingBooking = useSelector(
    (state) => state.loaderState?.loaders?.[LOADER_TYPES.CREATE_BOOKING]
  );

  const durations = [
    { value: 15, label: '15 Minutes', cost: expert?.pricing?.per15Min || 0 },
    { value: 30, label: '30 Minutes', cost: expert?.pricing?.per30Min || 0 },
    { value: 60, label: '60 Minutes', cost: expert?.pricing?.per60Min || 0 },
  ];

  // Generate next 30 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  // Reset state when modal closes, or pre-select duration when opening with initialDuration
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setSelectedDuration(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setNotes('');
      dispatch(clearAvailableSlots());
    } else if (initialDuration && [15, 30, 60].includes(initialDuration)) {
      // Skip to date selection when opened with a pre-selected duration
      setSelectedDuration(initialDuration);
      setCurrentStep(2);
    }
  }, [open, initialDuration, dispatch]);

  // Fetch slots when date is selected
  useEffect(() => {
    if (selectedDate && selectedDuration && expert?.expertId) {
      dispatch(
        fetchAvailableSlots({
          expertId: expert.expertId,
          date: toLocalDateStr(selectedDate),
          duration: selectedDuration,
        })
      );
    }
  }, [selectedDate, selectedDuration, expert?.expertId, dispatch]);

  const handleDurationSelect = (duration) => {
    setSelectedDuration(duration);
    setCurrentStep(2);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setCurrentStep(3);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setCurrentStep(4);
  };

  const handleConfirmBooking = () => {
    dispatch(
      createBooking(
        {
          expertId: expert.expertId,
          date: toLocalDateStr(selectedDate),
          startTime: selectedSlot.startTime,
          duration: selectedDuration,
          notes: notes.trim(),
        },
        () => {
          // Navigate first — component will unmount and reinitialize on next visit
          navigate('/stylist/bookings');
        }
      )
    );
  };

  const handleGetCredits = () => {
    onClose();
    navigate('/stylist/credits');
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 4) {
        setSelectedSlot(null);
        setCurrentStep(3);
      } else if (currentStep === 3) {
        setSelectedDate(null);
        dispatch(clearAvailableSlots());
        setCurrentStep(2);
      } else if (currentStep === 2) {
        setSelectedDuration(null);
        setCurrentStep(1);
      }
    }
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return {
      day: days[date.getDay()],
      date: date.getDate(),
      month: months[date.getMonth()],
      full: `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
    };
  };

  const selectedCost =
    durations.find((d) => d.value === selectedDuration)?.cost || 0;
  const hasInsufficientCredits = creditBalance < selectedCost;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 pb-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Book a Session
            </h2>
            <IconButton onClick={onClose} size="small">
              <CloseOutlined />
            </IconButton>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-8'
                    : 'w-2'
                } ${
                  step <= currentStep
                    ? 'bg-opacity-100'
                    : 'bg-opacity-30'
                }`}
                style={{
                  backgroundColor:
                    step <= currentStep
                      ? colors?.fourth || '#6366f1'
                      : '#d1d5db',
                }}
              />
            ))}
          </div>

          {/* Back Button */}
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="mt-3 text-sm font-medium hover:underline"
              style={{ color: colors?.fourth || '#6366f1' }}
            >
              ← Back
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Pick Duration */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <AccessTimeOutlined />
                  Select Duration
                </h3>
                <div className="space-y-3">
                  {durations.map((duration) => {
                    const isDisabled = duration.cost === 0;
                    return (
                      <button
                        key={duration.value}
                        onClick={() =>
                          !isDisabled && handleDurationSelect(duration.value)
                        }
                        disabled={isDisabled}
                        className={`w-full p-4 rounded-xl border-2 transition-all ${
                          isDisabled
                            ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-opacity-100 hover:shadow-lg'
                        }`}
                        style={{
                          borderColor: !isDisabled
                            ? toRgba(colors?.fourth || '#6366f1', 0.3)
                            : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {duration.label}
                          </span>
                          <span
                            className="text-xl font-bold"
                            style={{
                              color: !isDisabled
                                ? colors?.fourth || '#6366f1'
                                : '#9ca3af',
                            }}
                          >
                            {isDisabled ? 'N/A' : `${duration.cost} credits`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Pick Date */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CalendarMonthOutlined />
                  Select Date
                </h3>
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-2 min-w-max">
                    {dates.map((date, index) => {
                      const formatted = formatDate(date);
                      const isToday = index === 0;
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(date)}
                          className="flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-w-[70px] hover:shadow-md"
                          style={{
                            borderColor: toRgba(
                              colors?.fourth || '#6366f1',
                              0.3
                            ),
                            backgroundColor: isToday
                              ? toRgba(colors?.fourth || '#6366f1', 0.1)
                              : 'transparent',
                          }}
                        >
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {formatted.day}
                          </span>
                          <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {formatted.date}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatted.month}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Pick Time Slot */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <AccessTimeOutlined />
                  Select Time Slot
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {formatDate(selectedDate).full}
                </p>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-12">
                    <CircularProgress
                      size={40}
                      style={{ color: colors?.fourth || '#6366f1' }}
                    />
                  </div>
                ) : availableSlots?.slots?.filter((slot) => slot.available)
                    .length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                    {availableSlots.slots
                      .filter((slot) => slot.available)
                      .map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleSlotSelect(slot)}
                          className="p-3 rounded-lg border-2 transition-all hover:shadow-md"
                          style={{
                            borderColor: toRgba(
                              colors?.fourth || '#6366f1',
                              0.3
                            ),
                          }}
                        >
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {slot.startTime}
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No slots available on this date
                    </p>
                    <Button
                      onClick={handleBack}
                      style={{
                        color: colors?.fourth || '#6366f1',
                        marginTop: '1rem',
                      }}
                    >
                      Choose Another Date
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Confirm */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircleOutlined />
                  Confirm Booking
                </h3>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Expert
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {expert?.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Date
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDate(selectedDate).full}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Time
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedSlot?.startTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Duration
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {selectedDuration} minutes
                    </span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Cost
                    </span>
                    <span
                      className="font-bold text-xl"
                      style={{ color: colors?.fourth || '#6366f1' }}
                    >
                      {selectedCost} credits
                    </span>
                  </div>
                </div>

                {/* Credit Balance */}
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Your Balance
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        hasInsufficientCredits
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {creditBalance} credits
                    </span>
                  </div>
                </div>

                {/* Insufficient Credits Warning */}
                {hasInsufficientCredits && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      Insufficient credits for this booking
                    </p>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleGetCredits}
                      style={{
                        backgroundColor: colors?.fourth || '#6366f1',
                        color: 'white',
                      }}
                    >
                      Get Credits
                    </Button>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setNotes(e.target.value);
                      }
                    }}
                    placeholder="Add any special requests or topics you'd like to discuss..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    style={{
                      focusRing: `2px solid ${colors?.fourth || '#6366f1'}`,
                    }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {notes.length}/500
                  </p>
                </div>

                {/* Confirm Button */}
                {!hasInsufficientCredits && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleConfirmBooking}
                    disabled={loadingBooking}
                    style={{
                      backgroundColor: colors?.fourth || '#6366f1',
                      color: 'white',
                      padding: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                    }}
                  >
                    {loadingBooking ? (
                      <CircularProgress size={24} style={{ color: 'white' }} />
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;
