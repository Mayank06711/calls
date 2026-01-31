import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { VideoLibraryOutlined, PlayCircleOutline, HighQuality, Download, DataSaverOn, Lock } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updateReelsPreferencesSettings } from '../../../../../../../redux/thunks/settings.thunk';
import { useAIContext } from '../../../../../../../context/AIContext';

function ReelsSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);
  const isExpert = useSelector(state => state.auth.userInfo?.isExpert);

  // Local state for immediate UI feedback (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.reelsPreferences || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.reelsPreferences) {
      setLocalPrefs(data.reelsPreferences);
    }
  }, [data?.reelsPreferences]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions?.hasAccess;
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // AI context for reels settings
  useEffect(() => {
    const p = localPrefs;
    const summary = `User is configuring reels settings. ${hasAccess ? `Autoplay: ${p.autoPlay ? "on" : "off"}, Default quality: ${p.defaultQuality || "auto"}, Download options: ${p.downloadOptions ? "on" : "off"}, Data saver: ${p.dataSaver ? "on" : "off"}.` : `Reels settings are locked (requires premium subscription).${isExpert ? " User is an expert — settings not available for expert accounts." : ""}`}`;
    setAIPageContext({ page: "settings/reels", description: summary });
    return () => clearAIPageContext();
  }, [localPrefs, hasAccess, isExpert, setAIPageContext, clearAIPageContext]);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const changes = { ...pendingRef.current };
      pendingRef.current = {};
      setSaving(true);
      try {
        await dispatch(updateReelsPreferencesSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  };

  const handleToggle = useCallback((field) => {
    setLocalPrefs(prev => {
      const newValue = !(prev[field] ?? false);
      pendingRef.current = { ...pendingRef.current, [field]: newValue };
      return { ...prev, [field]: newValue };
    });
    resetTimer();
  }, [dispatch]);

  const handleSelectChange = useCallback((field, value) => {
    setLocalPrefs(prev => ({ ...prev, [field]: value }));
    pendingRef.current = { ...pendingRef.current, [field]: value };
    resetTimer();
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  const qualityOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <SettingTemplate title="Reels Settings" icon={<VideoLibraryOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Manage Reel Preferences</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Customize your reels viewing experience</p>

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
                : <>Reels preferences including autoplay, download options, data saver, and quality settings are available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.</>}
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
          {/* Autoplay Videos — PREMIUM */}
          <ToggleRow
            icon={<PlayCircleOutline style={{ color: colors.fourth }} />}
            label="Autoplay Videos"
            description="Play videos automatically when scrolling"
            checked={localPrefs.autoPlay ?? false}
            onChange={() => handleToggle('autoPlay')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Default Quality — PREMIUM */}
          <SelectRow
            icon={<HighQuality style={{ color: colors.fourth }} />}
            label="Default Quality"
            description="Set default video quality for reels"
            value={localPrefs.defaultQuality ?? 'auto'}
            onChange={(e) => handleSelectChange('defaultQuality', e.target.value)}
            options={qualityOptions}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Download Options — PREMIUM */}
          <ToggleRow
            icon={<Download style={{ color: colors.fourth }} />}
            label="Download Options"
            description="Allow reels to be saved for offline viewing"
            checked={localPrefs.downloadOptions ?? false}
            onChange={() => handleToggle('downloadOptions')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Data Saver — PREMIUM */}
          <ToggleRow
            icon={<DataSaverOn style={{ color: colors.fourth }} />}
            label="Data Saver"
            description="Reduce data usage when streaming reels"
            checked={localPrefs.dataSaver ?? false}
            onChange={() => handleToggle('dataSaver')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />
        </div>
      </div>

      {/* Custom styles for subscription-colored toggles and dropdown */}
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
        className={`rounded-lg border px-3 py-2 min-w-[120px] dark:bg-gray-700 dark:text-dark-text bg-white text-light-text focus:outline-none ${isInactive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default ReelsSettings;
