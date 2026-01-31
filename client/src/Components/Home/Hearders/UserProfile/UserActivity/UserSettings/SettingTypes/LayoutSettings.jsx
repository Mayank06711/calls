import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ViewQuiltOutlined, Lock } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updateLayoutSettings } from '../../../../../../../redux/thunks/settings.thunk';
import { useAIContext } from '../../../../../../../context/AIContext';

function LayoutSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);
  const isExpert = useSelector(state => state.auth.userInfo?.isExpert);

  // Local state for immediate UI feedback (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.layout || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.layout) {
      setLocalPrefs(data.layout);
    }
  }, [data?.layout]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions?.hasAccess;
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // AI context for layout settings
  useEffect(() => {
    const summary = `User is configuring layout settings. ${hasAccess ? `Sidebar position: ${localPrefs.sidebarPosition || "left"}, Density: ${localPrefs.compactView ? "compact" : "comfortable"}.` : `Layout settings are locked (requires premium subscription).${isExpert ? " User is an expert — settings not available for expert accounts." : ""}`}`;
    setAIPageContext({ page: "settings/layout", description: summary });
    return () => clearAIPageContext();
  }, [localPrefs, hasAccess, isExpert, setAIPageContext, clearAIPageContext]);

  const handleChange = useCallback((field, value) => {
    // Functional update so we always read the latest local state
    setLocalPrefs(prev => {
      pendingRef.current = { ...pendingRef.current, [field]: value };
      return { ...prev, [field]: value };
    });

    // Reset debounce timer — fires 800ms after last change
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updateLayoutSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  return (
    <SettingTemplate title="Layout Settings" icon={<ViewQuiltOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Customize Your View</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Adjust the layout of your interface</p>

        {/* Premium Feature Notice */}
        {!hasAccess && !styleOptions?.loading && (
          <div className={`mb-6 p-4 rounded-lg ${isExpert ? 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-500/30' : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className={isExpert ? "text-gray-500" : "text-amber-500"} fontSize="small" />
              <span className={`font-semibold ${isExpert ? 'text-gray-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isExpert ? "Not Available" : "Premium Feature"}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {isExpert
                ? "Settings are not available for expert accounts. Please contact an admin if you need this functionality."
                : <>Layout customization is available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.</>}
            </p>
            {!isExpert && (
              <button
                onClick={handleUpgradeClick}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                Upgrade Now
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Sidebar Position */}
          <SelectRow
            label="Sidebar Position"
            description="Choose which side the sidebar appears on"
            value={localPrefs.sidebarPosition || 'left'}
            onChange={(e) => handleChange('sidebarPosition', e.target.value)}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ]}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Density */}
          <SelectRow
            label="Density"
            description="Content density of the interface"
            value={localPrefs.compactView ? 'compact' : 'comfortable'}
            onChange={(e) => handleChange('compactView', e.target.value === 'compact')}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />
        </div>
      </div>

      {/* Custom styles for subscription-colored focus ring and dropdown */}
      <style>{`
        select:focus {
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
      `}</style>
    </SettingTemplate>
  );
}

function SelectRow({ label, description, value, onChange, options, locked, saving, colors }) {
  const isInactive = locked || saving;

  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px]
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text
    focus:outline-none
    ${isInactive ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`;

  const selectStyle = {
    borderColor: colors.fourth,
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50 ${locked ? 'opacity-50' : ''} ${saving ? 'opacity-70' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium dark:text-dark-text text-light-text">{label}</h3>
          {locked && <Lock className="text-amber-500" sx={{ fontSize: 16 }} />}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <select
        className={selectClassName}
        style={selectStyle}
        value={value}
        onChange={isInactive ? undefined : onChange}
        disabled={isInactive}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LayoutSettings;
