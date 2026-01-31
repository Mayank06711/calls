import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BarChartOutlined, PersonOutline, VisibilityOff, EmailOutlined, DeleteOutline, Lock } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updateAnalyticsPreferencesSettings } from '../../../../../../../redux/thunks/settings.thunk';
import { useAIContext } from '../../../../../../../context/AIContext';

function AnalyticsSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);
  const isExpert = useSelector(state => state.auth.userInfo?.isExpert);

  // Local state for immediate UI feedback (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.analyticsPreferences || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.analyticsPreferences) {
      setLocalPrefs(data.analyticsPreferences);
    }
  }, [data?.analyticsPreferences]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions?.hasAccess;
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // AI context for analytics settings
  useEffect(() => {
    const prefs = localPrefs;
    const summary = `User is configuring analytics preferences. ${hasAccess ? `Personal analytics: ${prefs.personalAnalytics ? "on" : "off"}, Anonymous usage: ${prefs.anonymousUsage ? "on" : "off"}, Weekly report: ${prefs.weeklyReport ? "on" : "off"}, Data retention: ${prefs.dataRetention || "default"}.` : `Analytics settings are locked (requires premium subscription).${isExpert ? " User is an expert — experts get analytics with eligible plans." : ""}`}`;
    setAIPageContext({ page: "settings/analytics", description: summary });
    return () => clearAIPageContext();
  }, [localPrefs, hasAccess, isExpert, setAIPageContext, clearAIPageContext]);

  const handleToggle = useCallback((field) => {
    setLocalPrefs(prev => {
      const newValue = !(prev[field] ?? false);
      pendingRef.current = { ...pendingRef.current, [field]: newValue };
      return { ...prev, [field]: newValue };
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updateAnalyticsPreferencesSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleSelectChange = useCallback((field, value) => {
    setLocalPrefs(prev => ({ ...prev, [field]: value }));
    pendingRef.current = { ...pendingRef.current, [field]: value };

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updateAnalyticsPreferencesSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px]
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text
    focus:outline-none`;

  const selectStyle = {
    borderColor: colors.fourth,
  };

  return (
    <SettingTemplate title="Analytics Settings" icon={<BarChartOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">View Your Statistics</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Manage your analytics preferences and data collection</p>

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
                : <>Analytics preferences are available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.</>}
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

        <div className="mt-4 space-y-6">
          {/* Data Collection Preferences */}
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Data Collection Preferences</h3>
            <div className="space-y-4">
              <ToggleRow
                icon={<PersonOutline style={{ color: colors.fourth }} />}
                label="Personal Analytics"
                description="Collect data about your own usage"
                checked={localPrefs.personalAnalytics ?? false}
                onChange={() => handleToggle('personalAnalytics')}
                locked={!hasAccess}
                saving={saving}
                colors={colors}
              />

              <ToggleRow
                icon={<VisibilityOff style={{ color: colors.fourth }} />}
                label="Anonymous Feature Usage"
                description="Share anonymous data to improve app"
                checked={localPrefs.anonymousUsage ?? false}
                onChange={() => handleToggle('anonymousUsage')}
                locked={!hasAccess}
                saving={saving}
                colors={colors}
              />
            </div>
          </div>

          {/* Analytics Controls */}
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Analytics Controls</h3>
            <div className="space-y-4">
              <ToggleRow
                icon={<EmailOutlined style={{ color: colors.fourth }} />}
                label="Weekly Report"
                description="Receive weekly analytics summary"
                checked={localPrefs.weeklyReport ?? false}
                onChange={() => handleToggle('weeklyReport')}
                locked={!hasAccess}
                saving={saving}
                colors={colors}
              />

              <SelectRow
                label="Data Retention"
                description="How long to keep your analytics data"
                value={localPrefs.dataRetention ?? '6months'}
                onChange={(value) => handleSelectChange('dataRetention', value)}
                locked={!hasAccess}
                saving={saving}
                selectClassName={selectClassName}
                selectStyle={selectStyle}
                options={[
                  { value: '3months', label: '3 months' },
                  { value: '6months', label: '6 months' },
                  { value: '1year', label: '1 year' },
                  { value: 'forever', label: 'Forever' },
                ]}
              />
            </div>
          </div>

          {/* Activity Overview */}
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Activity Overview</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Post Views</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">1,245</p>
                  <p className="text-xs" style={{ color: colors.fourth }}>+12% from last week</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Engagement</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">38%</p>
                  <p className="text-xs text-red-500">-2% from last week</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Messages</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">28</p>
                  <p className="text-xs" style={{ color: colors.fourth }}>+5 from last week</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Active Time</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">3.5h</p>
                  <p className="text-xs text-gray-500">Similar to last week</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reset Analytics Data */}
          <div>
            <button
              disabled={!hasAccess}
              className={`flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <DeleteOutline fontSize="small" />
              Reset Analytics Data
            </button>
          </div>
        </div>
      </div>

      {/* Custom styles for subscription-colored toggles and dropdowns */}
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

function SelectRow({ label, description, value, onChange, locked, saving, selectClassName, selectStyle, options }) {
  const isInactive = locked || saving;
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50 ${locked ? 'opacity-50' : ''} ${saving ? 'opacity-70' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium dark:text-dark-text text-light-text">{label}</p>
          {locked && <Lock className="text-amber-500" sx={{ fontSize: 16 }} />}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <select
        className={`${selectClassName} ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={selectStyle}
        value={value}
        onChange={(e) => !isInactive && onChange(e.target.value)}
        disabled={isInactive}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default AnalyticsSettings;
