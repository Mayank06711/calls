import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { TimelineOutlined, TrackChanges, Lock } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updateUsageTrackingSettings } from '../../../../../../../redux/thunks/settings.thunk';

function UsageSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);
  const isExpert = useSelector(state => state.auth.userInfo?.isExpert);

  // Local state for immediate UI toggle (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.usageTracking || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.usageTracking) {
      setLocalPrefs(data.usageTracking);
    }
  }, [data?.usageTracking]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions?.hasAccess;

  const handleToggle = useCallback((field) => {
    // Functional update so we always read the latest local state
    setLocalPrefs(prev => {
      const newValue = !(prev[field] ?? false);
      pendingRef.current = { ...pendingRef.current, [field]: newValue };
      return { ...prev, [field]: newValue };
    });

    // Reset debounce timer — fires 800ms after last toggle
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updateUsageTrackingSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  return (
    <SettingTemplate title="Usage Tracking" icon={<TimelineOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Monitor Your Activity</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Control how your usage data is tracked and displayed</p>

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
                : <>Usage tracking settings are available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.</>}
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
          {/* Activity Tracking — PREMIUM */}
          <ToggleRow
            icon={<TrackChanges style={{ color: colors.fourth }} />}
            label="Activity Tracking"
            description="Allow us to collect and display your usage data"
            checked={localPrefs.activityTracking ?? false}
            onChange={() => handleToggle('activityTracking')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Daily App Usage Chart — Visual Only */}
          <div className="p-3 border rounded-lg dark:border-gray-700" style={{ borderColor: colors.fourth }}>
            <h3 className="font-medium mb-2 dark:text-dark-text text-light-text">Daily App Usage</h3>
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded relative">
              <div className="absolute bottom-0 left-0 w-1/4 h-1/3 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-1/4 w-1/4 h-2/3 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-2/4 w-1/4 h-1/2 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-3/4 w-1/4 h-1/4 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for subscription-colored toggles */}
      <style>{`
        .peer:checked + div {
          background-color: ${colors.fourth} !important;
        }
      `}</style>
    </SettingTemplate>
  );
}

function ToggleRow({ icon, label, description, checked, onChange, locked, saving, colors }) {
  const isInactive = locked || saving;
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50 ${locked ? 'opacity-50' : ''} ${saving ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium dark:text-dark-text text-light-text">{label}</h3>
            {locked && <Lock className="text-amber-500" sx={{ fontSize: 16 }} />}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <label className={`relative inline-flex items-center ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={isInactive ? undefined : onChange}
          disabled={isInactive}
          readOnly={isInactive}
        />
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
      </label>
    </div>
  );
}

export default UsageSettings;
