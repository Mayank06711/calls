import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button, Switch, Slider } from '@mui/material';
import {
  ArrowBack,
  ScheduleOutlined,
  SaveOutlined,
  PeopleOutlined,
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import { fetchExpertAvailability, updateExpertAvailability } from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { ENDPOINTS, HTTP_METHODS } from '../../../../constants/apiEndpoints';
import { makeRequest } from '../../../../utils/apiHandlers';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Colombo',
  'Asia/Dhaka',
  'America/New_York',
  'Europe/London',
];
const DURATION_OPTIONS = [15, 30, 60];

const ExpertScheduleEditor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();

  const expertAvailability = useSelector((state) => state.booking?.expertAvailability);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.EXPERT_AVAILABILITY]);

  const [expertId, setExpertId] = useState(null);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [weeklySlots, setWeeklySlots] = useState(
    DAYS.map((_, i) => ({
      day: i,
      startTime: '10:00',
      endTime: '18:00',
      isActive: i >= 1 && i <= 5, // Mon-Fri by default
    }))
  );
  const [slotDurations, setSlotDurations] = useState([15, 30, 60]);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch expert profile to get expertId
  useEffect(() => {
    const fetchExpertProfile = async () => {
      try {
        const response = await makeRequest({
          url: ENDPOINTS.EXPERT_PROFILE,
          method: HTTP_METHODS.GET,
        });

        if (response.success && response.data?.expert?._id) {
          const id = response.data.expert._id;
          setExpertId(id);
          // Fetch availability using the expert ID
          dispatch(fetchExpertAvailability(id));
        }
      } catch (error) {
        console.error('Failed to fetch expert profile:', error);
      }
    };

    fetchExpertProfile();
  }, [dispatch]);

  // Populate state from Redux when expertAvailability is loaded
  useEffect(() => {
    if (expertAvailability) {
      if (expertAvailability.timezone) {
        setTimezone(expertAvailability.timezone);
      }
      if (expertAvailability.weeklySlots && Array.isArray(expertAvailability.weeklySlots)) {
        setWeeklySlots(
          DAYS.map((_, i) => {
            const slot = expertAvailability.weeklySlots.find((s) => s.day === i);
            return slot || {
              day: i,
              startTime: '10:00',
              endTime: '18:00',
              isActive: false,
            };
          })
        );
      }
      if (expertAvailability.slotDurations && Array.isArray(expertAvailability.slotDurations)) {
        setSlotDurations(expertAvailability.slotDurations);
      }
      if (typeof expertAvailability.bufferMinutes === 'number') {
        setBufferMinutes(expertAvailability.bufferMinutes);
      }
    }
  }, [expertAvailability]);

  const handleToggleDay = (dayIndex) => {
    setWeeklySlots((prev) =>
      prev.map((slot) =>
        slot.day === dayIndex ? { ...slot, isActive: !slot.isActive } : slot
      )
    );
  };

  const handleTimeChange = (dayIndex, field, value) => {
    setWeeklySlots((prev) =>
      prev.map((slot) =>
        slot.day === dayIndex ? { ...slot, [field]: value } : slot
      )
    );
  };

  const handleDurationToggle = (duration) => {
    setSlotDurations((prev) => {
      if (prev.includes(duration)) {
        // Don't allow removing the last duration
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== duration);
      } else {
        return [...prev, duration].sort((a, b) => a - b);
      }
    });
  };

  const handleSave = () => {
    // Validate at least one duration is selected
    if (slotDurations.length === 0) {
      alert('Please select at least one session duration');
      return;
    }

    setIsSaving(true);
    dispatch(
      updateExpertAvailability(
        {
          timezone,
          weeklySlots,
          slotDurations,
          bufferMinutes,
        },
        () => navigate('/stylist')
      )
    ).finally(() => setIsSaving(false));
  };

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/stylist')}
              className="text-white hover:opacity-80 transition-opacity"
            >
              <ArrowBack />
            </button>
            <div className="flex items-center gap-2 flex-grow">
              <ScheduleOutlined sx={{ fontSize: 24 }} className="text-white" />
              <h1 className="text-xl font-semibold text-white">My Schedule</h1>
            </div>
            <button
              onClick={() => navigate('/expert-bookings')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors"
            >
              <PeopleOutlined sx={{ fontSize: 16 }} />
              Client Sessions
            </button>
          </div>
        </div>
      </div>

      {isLoading && !expertId ? (
        <div className="text-center py-12">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your schedule...</p>
        </div>
      ) : (
        <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
          {/* Timezone Selector */}
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-dark-text">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': colors.fourth }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          {/* Weekly Schedule Grid */}
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text">
              Weekly Availability
            </h2>
            <div className="space-y-3">
              {weeklySlots.map((slot, index) => (
                <div
                  key={slot.day}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    slot.isActive
                      ? 'bg-gray-50 dark:bg-gray-800/50'
                      : 'bg-gray-100/50 dark:bg-gray-900/30 opacity-50'
                  }`}
                  style={{
                    border: slot.isActive
                      ? `1px solid ${toRgba(colors.fourth, 0.3)}`
                      : '1px solid transparent',
                  }}
                >
                  {/* Day Name */}
                  <div className="w-28 font-semibold text-gray-900 dark:text-dark-text">
                    {DAYS[index]}
                  </div>

                  {/* Toggle Switch */}
                  <Switch
                    checked={slot.isActive}
                    onChange={() => handleToggleDay(slot.day)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: colors.fourth,
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: colors.fourth,
                      },
                    }}
                  />

                  {/* Start Time */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">Start:</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleTimeChange(slot.day, 'startTime', e.target.value)}
                      disabled={!slot.isActive}
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: slot.isActive ? toRgba(colors.fourth, 0.3) : undefined,
                      }}
                    />
                  </div>

                  {/* End Time */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500 dark:text-gray-400">End:</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleTimeChange(slot.day, 'endTime', e.target.value)}
                      disabled={!slot.isActive}
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: slot.isActive ? toRgba(colors.fourth, 0.3) : undefined,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Durations */}
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text">
              Session Durations (minutes)
            </h2>
            <div className="flex gap-6">
              {DURATION_OPTIONS.map((duration) => (
                <label
                  key={duration}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={slotDurations.includes(duration)}
                    onChange={() => handleDurationToggle(duration)}
                    className="w-5 h-5 rounded cursor-pointer"
                    style={{ accentColor: colors.fourth }}
                  />
                  <span className="text-base text-gray-800 dark:text-gray-200 group-hover:opacity-80 transition-opacity">
                    {duration} min
                  </span>
                </label>
              ))}
            </div>
            {slotDurations.length === 0 && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-2">
                At least one duration must be selected
              </p>
            )}
          </div>

          {/* Buffer Minutes */}
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text">
              Buffer Between Sessions
            </h2>
            <div className="flex items-center gap-6">
              <Slider
                value={bufferMinutes}
                onChange={(e, value) => setBufferMinutes(value)}
                min={0}
                max={60}
                step={5}
                marks={[
                  { value: 0, label: '0' },
                  { value: 30, label: '30' },
                  { value: 60, label: '60' },
                ]}
                valueLabelDisplay="on"
                sx={{
                  flex: 1,
                  color: colors.fourth,
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: colors.fourth,
                  },
                  '& .MuiSlider-markLabel': {
                    color: 'inherit',
                  },
                }}
              />
              <div className="text-lg font-semibold w-20 text-right text-gray-900 dark:text-dark-text">
                {bufferMinutes} min
              </div>
            </div>
          </div>

          {/* Save / Cancel Buttons */}
          <div className="flex justify-end gap-4 pb-4">
            <Button
              variant="outlined"
              onClick={() => navigate('/stylist')}
              disabled={isSaving}
              sx={{
                borderColor: toRgba(colors.fourth, 0.5),
                color: colors.fourth,
                '&:hover': {
                  borderColor: colors.fourth,
                  backgroundColor: toRgba(colors.fourth, 0.1),
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={isSaving || slotDurations.length === 0}
              startIcon={<SaveOutlined />}
              sx={{
                backgroundColor: colors.fourth,
                color: '#fff',
                '&:hover': {
                  backgroundColor: colors.fourth,
                  opacity: 0.9,
                },
                '&:disabled': {
                  backgroundColor: toRgba(colors.fourth, 0.3),
                  color: toRgba('#fff', 0.5),
                },
              }}
            >
              {isSaving ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertScheduleEditor;
