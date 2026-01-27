import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { TuneOutlined, Language, AccessTime, Lock } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updatePreferenceSettings } from '../../../../../../../redux/thunks/settings.thunk';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];

const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12-hour' },
  { value: '24h', label: '24-hour' },
];

function PreferenceSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);

  // Local state for immediate UI feedback (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.preferences || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.preferences) {
      setLocalPrefs(data.preferences);
    }
  }, [data?.preferences]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions.hasAccess;

  const handleChange = useCallback((field, value) => {
    setLocalPrefs(prev => ({ ...prev, [field]: value }));
    pendingRef.current = { ...pendingRef.current, [field]: value };

    // Reset debounce timer — fires 800ms after last change
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updatePreferenceSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  return (
    <SettingTemplate title="Preference Settings" icon={<TuneOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Set Your App Preferences</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Customize language and time display settings</p>

        {/* Premium Feature Notice */}
        {!hasAccess && !styleOptions.loading && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="text-amber-500" fontSize="small" />
              <span className="font-semibold text-amber-600 dark:text-amber-400">Premium Feature</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Preference settings are available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.
            </p>
            <button
              onClick={handleUpgradeClick}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              Upgrade Now
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Language — PREMIUM */}
          <SelectRow
            icon={<Language style={{ color: colors.fourth }} />}
            label="Language"
            description="Choose your preferred language"
            value={localPrefs.language ?? 'en'}
            onChange={(e) => handleChange('language', e.target.value)}
            options={LANGUAGE_OPTIONS}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Time Format — PREMIUM */}
          <SelectRow
            icon={<AccessTime style={{ color: colors.fourth }} />}
            label="Time Format"
            description="12-hour or 24-hour clock"
            value={localPrefs.timeFormat ?? '12h'}
            onChange={(e) => handleChange('timeFormat', e.target.value)}
            options={TIME_FORMAT_OPTIONS}
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

function SelectRow({ icon, label, description, value, onChange, options, locked, saving, colors }) {
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
      <select
        value={value}
        onChange={isInactive ? undefined : onChange}
        disabled={isInactive}
        style={{ borderColor: !locked ? colors.fourth : undefined }}
        className={`rounded-lg border px-3 py-2 min-w-[140px] dark:bg-gray-700 dark:text-dark-text bg-white text-light-text focus:outline-none ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default PreferenceSettings;
