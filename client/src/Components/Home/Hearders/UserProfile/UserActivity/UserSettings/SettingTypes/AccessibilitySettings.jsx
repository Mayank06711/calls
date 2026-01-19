import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AccessibilityNewOutlined, Lock } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import SettingTemplate from '../SettingTemplate';
import { fetchStyleOptionsThunk, updateAccessibilityFontSize, updateAccessibilityFontFamily } from '../../../../../../../redux/thunks/settings.thunk';
import { FONT_SIZE_OPTIONS, FONT_FAMILY_OPTIONS, applyFontSize, applyFontFamily, dbValueToFontSize } from '../../../../../../../constants/styleOptions';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function AccessibilitySettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useSubscriptionColors();
  const { styleOptions, data } = useSelector(state => state.settings);
  // Convert DB number to string for display
  const initialFontSize = typeof data?.accessibility?.fontSize === 'number' 
    ? dbValueToFontSize(data.accessibility.fontSize) 
    : (data?.accessibility?.fontSize || 'medium');
  const [selectedFontSize, setSelectedFontSize] = useState(initialFontSize);
  const [selectedFontFamily, setSelectedFontFamily] = useState(data?.accessibility?.fontFamily || 'inter');
  const [isUpdatingSize, setIsUpdatingSize] = useState(false);
  const [isUpdatingFamily, setIsUpdatingFamily] = useState(false);

  // Fetch style options on mount
  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
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

  const handleFontSizeChange = async (e) => {
    const newSize = e.target.value;
    
    if (!styleOptions.hasAccess) {
      // Show upgrade message - don't change the value
      return;
    }

    setSelectedFontSize(newSize);
    setIsUpdatingSize(true);
    
    // Immediately apply for preview
    applyFontSize(newSize);
    
    // Save to backend
    const result = await dispatch(updateAccessibilityFontSize(newSize));
    setIsUpdatingSize(false);
    
    if (!result.success) {
      // Revert on failure
      setSelectedFontSize(data?.accessibility?.fontSize || 'medium');
      applyFontSize(data?.accessibility?.fontSize || 'medium');
    }
  };

  const handleFontFamilyChange = async (e) => {
    const newFamily = e.target.value;
    
    if (!styleOptions.hasAccess) {
      return;
    }

    setSelectedFontFamily(newFamily);
    setIsUpdatingFamily(true);
    
    // Immediately apply for preview
    applyFontFamily(newFamily);
    
    // Save to backend
    const result = await dispatch(updateAccessibilityFontFamily(newFamily));
    setIsUpdatingFamily(false);
    
    if (!result.success) {
      // Revert on failure
      setSelectedFontFamily(data?.accessibility?.fontFamily || 'inter');
      applyFontFamily(data?.accessibility?.fontFamily || 'inter');
    }
  };

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  return (
    <SettingTemplate title="Accessibility Settings" icon={<AccessibilityNewOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Adjust Accessibility Options</h2>
        
        {/* Premium Feature Notice */}
        {!styleOptions.hasAccess && !styleOptions.loading && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="text-amber-500" fontSize="small" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">Premium Feature</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Font size and font family customization is available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.
            </p>
            <button
              onClick={handleUpgradeClick}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              Upgrade Now
            </button>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Font Size Setting */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium dark:text-dark-text text-light-text">Font Size</h3>
                {!styleOptions.hasAccess && (
                  <Lock className="text-amber-500" fontSize="small" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Adjust the text size across the app</p>
            </div>
            <div className="relative">
              {styleOptions.loading ? (
                <CircularProgress size={24} />
              ) : (
                <select
                  value={selectedFontSize}
                  onChange={handleFontSizeChange}
                  disabled={!styleOptions.hasAccess || isUpdatingSize}
                  style={{
                    '--ring-color': colors.fourth,
                    borderColor: styleOptions.hasAccess ? colors.fourth : undefined,
                  }}
                  className={`rounded-lg border px-3 py-2 min-w-[140px] 
                    dark:bg-gray-700 dark:text-dark-text
                    bg-white text-light-text
                    focus:ring-2 focus:border-transparent
                    ${!styleOptions.hasAccess ? 'opacity-50 cursor-not-allowed dark:border-gray-600 border-gray-300' : 'cursor-pointer'}
                    ${isUpdatingSize ? 'opacity-70' : ''}`}
                >
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.cssValue})
                    </option>
                  ))}
                </select>
              )}
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
              <div className="flex items-center gap-2">
                <h3 className="font-medium dark:text-dark-text text-light-text">Font Family</h3>
                {!styleOptions.hasAccess && (
                  <Lock className="text-amber-500" fontSize="small" />
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred font style</p>
            </div>
            <div className="relative">
              {styleOptions.loading ? (
                <CircularProgress size={24} />
              ) : (
                <select
                  value={selectedFontFamily}
                  onChange={handleFontFamilyChange}
                  disabled={!styleOptions.hasAccess || isUpdatingFamily}
                  style={{
                    '--ring-color': colors.fourth,
                    borderColor: styleOptions.hasAccess ? colors.fourth : undefined,
                    fontFamily: FONT_FAMILY_OPTIONS.find(f => f.value === selectedFontFamily)?.cssValue || 'Inter',
                  }}
                  className={`rounded-lg border px-3 py-2 min-w-[140px] 
                    dark:bg-gray-700 dark:text-dark-text
                    bg-white text-light-text
                    focus:ring-2 focus:border-transparent
                    ${!styleOptions.hasAccess ? 'opacity-50 cursor-not-allowed dark:border-gray-600 border-gray-300' : 'cursor-pointer'}
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
              )}
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