import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccessibilityNewOutlined } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import SettingTemplate from '../SettingTemplate';
import { fetchSettingsThunk, updateAccessibilityFontSize, updateAccessibilityFontFamily } from '../../../../../../../redux/thunks/settings.thunk';
import { FONT_SIZE_OPTIONS, FONT_FAMILY_OPTIONS, applyFontSize, applyFontFamily, dbValueToFontSize } from '../../../../../../../constants/styleOptions';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function AccessibilitySettings() {
  const dispatch = useDispatch();
  const colors = useSubscriptionColors();
  const { data } = useSelector(state => state.settings);
  // Convert DB number to string for display
  const initialFontSize = typeof data?.accessibility?.fontSize === 'number'
    ? dbValueToFontSize(data.accessibility.fontSize)
    : (data?.accessibility?.fontSize || 'medium');
  const [selectedFontSize, setSelectedFontSize] = useState(initialFontSize);
  const [selectedFontFamily, setSelectedFontFamily] = useState(data?.accessibility?.fontFamily || 'inter');
  const [isUpdatingSize, setIsUpdatingSize] = useState(false);
  const [isUpdatingFamily, setIsUpdatingFamily] = useState(false);

  // Debounce refs
  const fontSizeTimerRef = useRef(null);
  const fontFamilyTimerRef = useRef(null);

  // Fetch settings on mount
  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Set initial font size from settings (convert number to string)
  useEffect(() => {
    if (data?.accessibility?.fontSize !== undefined) {
      const fontSizeString = typeof data.accessibility.fontSize === 'number'
        ? dbValueToFontSize(data.accessibility.fontSize)
        : data.accessibility.fontSize;
      setSelectedFontSize(fontSizeString);
    }
  }, [data?.accessibility?.fontSize]);

  // Set initial font family from settings
  useEffect(() => {
    if (data?.accessibility?.fontFamily) {
      setSelectedFontFamily(data.accessibility.fontFamily);
    }
  }, [data?.accessibility?.fontFamily]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (fontSizeTimerRef.current) clearTimeout(fontSizeTimerRef.current);
      if (fontFamilyTimerRef.current) clearTimeout(fontFamilyTimerRef.current);
    };
  }, []);

  const handleFontSizeChange = (e) => {
    const newSize = e.target.value;

    setSelectedFontSize(newSize);
    applyFontSize(newSize); // Immediate preview

    // Debounce API call — fires 800ms after last change
    if (fontSizeTimerRef.current) clearTimeout(fontSizeTimerRef.current);
    fontSizeTimerRef.current = setTimeout(async () => {
      setIsUpdatingSize(true);
      const result = await dispatch(updateAccessibilityFontSize(newSize));
      setIsUpdatingSize(false);

      if (!result?.success) {
        setSelectedFontSize(data?.accessibility?.fontSize || 'medium');
        applyFontSize(data?.accessibility?.fontSize || 'medium');
      }
    }, 800);
  };

  const handleFontFamilyChange = (e) => {
    const newFamily = e.target.value;

    setSelectedFontFamily(newFamily);
    applyFontFamily(newFamily); // Immediate preview

    // Debounce API call — fires 800ms after last change
    if (fontFamilyTimerRef.current) clearTimeout(fontFamilyTimerRef.current);
    fontFamilyTimerRef.current = setTimeout(async () => {
      setIsUpdatingFamily(true);
      const result = await dispatch(updateAccessibilityFontFamily(newFamily));
      setIsUpdatingFamily(false);

      if (!result?.success) {
        setSelectedFontFamily(data?.accessibility?.fontFamily || 'inter');
        applyFontFamily(data?.accessibility?.fontFamily || 'inter');
      }
    }, 800);
  };

  return (
    <SettingTemplate title="Accessibility Settings" icon={<AccessibilityNewOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Adjust Accessibility Options</h2>

        <div className="mt-4 space-y-4">
          {/* Font Size Setting */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex-1">
              <h3 className="font-medium dark:text-dark-text text-light-text">Font Size</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Adjust the text size across the app</p>
            </div>
            <div className="relative">
              <select
                value={selectedFontSize}
                onChange={handleFontSizeChange}
                disabled={isUpdatingSize}
                style={{
                  '--ring-color': colors.fourth,
                  borderColor: colors.fourth,
                }}
                className={`rounded-lg border px-3 py-2 min-w-[140px]
                  dark:bg-gray-700 dark:text-dark-text
                  bg-white text-light-text
                  focus:ring-2 focus:border-transparent
                  cursor-pointer
                  ${isUpdatingSize ? 'opacity-70' : ''}`}
              >
                {FONT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.cssValue})
                  </option>
                ))}
              </select>
              {isUpdatingSize && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CircularProgress size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Font Family Setting */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex-1">
              <h3 className="font-medium dark:text-dark-text text-light-text">Font Family</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred font style</p>
            </div>
            <div className="relative">
              <select
                value={selectedFontFamily}
                onChange={handleFontFamilyChange}
                disabled={isUpdatingFamily}
                style={{
                  '--ring-color': colors.fourth,
                  borderColor: colors.fourth,
                  fontFamily: FONT_FAMILY_OPTIONS.find(f => f.value === selectedFontFamily)?.cssValue || 'Inter',
                }}
                className={`rounded-lg border px-3 py-2 min-w-[140px]
                  dark:bg-gray-700 dark:text-dark-text
                  bg-white text-light-text
                  focus:ring-2 focus:border-transparent
                  cursor-pointer
                  ${isUpdatingFamily ? 'opacity-70' : ''}`}
              >
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    style={{ fontFamily: option.cssValue }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              {isUpdatingFamily && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CircularProgress size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Screen Reader Support */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Screen Reader Support</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable enhanced screen reader support</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div
                className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{ '--toggle-active-color': colors.fourth }}
              ></div>
            </label>
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">High Contrast Mode</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Increase contrast for better visibility</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div
                className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{ '--toggle-active-color': colors.fourth }}
              ></div>
            </label>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Reduced Motion</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Minimize animations and transitions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div
                className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{ '--toggle-active-color': colors.fourth }}
              ></div>
            </label>
          </div>
        </div>
      </div>

      {/* Custom styles for subscription-colored focus ring and dropdown */}
      <style>{`
        select:focus {
          outline: none;
          box-shadow: 0 0 0 2px ${colors.fourth};
        }
        select option:checked,
        select option:hover {
          background: linear-gradient(${colors.fourth}, ${colors.fourth});
          color: white;
        }
        select option {
          background: #374151;
          color: white;
          padding: 8px;
        }
        /* Toggle switch subscription color */
        .peer:checked + div {
          background-color: ${colors.fourth} !important;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default AccessibilitySettings;
