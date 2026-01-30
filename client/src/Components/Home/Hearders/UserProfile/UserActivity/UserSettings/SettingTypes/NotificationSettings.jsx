import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { NotificationsOutlined, Email, Message, Campaign, VolumeUp, Lock, GraphicEq } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';
import { fetchStyleOptionsThunk, fetchSettingsThunk, updateNotificationSettings } from '../../../../../../../redux/thunks/settings.thunk';

function NotificationSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { styleOptions, data } = useSelector(state => state.settings);
  const isExpert = useSelector(state => state.auth.userInfo?.isExpert);

  // Local state for immediate UI toggle (optimistic update)
  const [localPrefs, setLocalPrefs] = useState(data?.notifications || {});
  const [saving, setSaving] = useState(false);
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchStyleOptionsThunk());
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates (after API response)
  useEffect(() => {
    if (data?.notifications) {
      setLocalPrefs(data.notifications);
    }
  }, [data?.notifications]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const hasAccess = styleOptions?.hasAccess;

  const handleToggle = useCallback((field) => {
    // Functional update so we always read the latest local state
    setLocalPrefs(prev => {
      const newValue = !(prev[field] ?? true);
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
        await dispatch(updateNotificationSettings(changes));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [dispatch]);

  const handleUpgradeClick = () => {
    navigate('/subscriptions');
  };

  return (
    <SettingTemplate title="Notification Settings" icon={<NotificationsOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Manage Your Alerts</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Choose what notifications you want to receive</p>

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
                : <>Push notifications, marketing alerts and sound controls are available for <strong>Gold</strong> and <strong>Platinum</strong> subscribers.</>}
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
          {/* Push Notifications — PREMIUM */}
          <ToggleRow
            icon={<NotificationsOutlined style={{ color: colors.fourth }} />}
            label="Push Notifications"
            description="Receive push notifications on this device"
            checked={localPrefs.push ?? true}
            onChange={() => handleToggle('push')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Email Notifications — FREE */}
          <ToggleRow
            icon={<Email style={{ color: colors.fourth }} />}
            label="Email Notifications"
            description="Receive important updates via email"
            checked={localPrefs.email ?? true}
            onChange={() => handleToggle('email')}
            locked={false}
            saving={saving}
            colors={colors}
          />

          {/* Message Alerts — FREE */}
          <ToggleRow
            icon={<Message style={{ color: colors.fourth }} />}
            label="Message Alerts"
            description="Get notified for new messages"
            checked={localPrefs.messageAlerts ?? true}
            onChange={() => handleToggle('messageAlerts')}
            locked={false}
            saving={saving}
            colors={colors}
          />

          {/* Chat Sound — FREE */}
          <ToggleRow
            icon={<GraphicEq style={{ color: colors.fourth }} />}
            label="Chat Sound"
            description="Play sound when sending or receiving chat messages"
            checked={localPrefs.chatSound ?? true}
            onChange={() => handleToggle('chatSound')}
            locked={false}
            saving={saving}
            colors={colors}
          />

          {/* Marketing — PREMIUM */}
          <ToggleRow
            icon={<Campaign style={{ color: colors.fourth }} />}
            label="Marketing"
            description="Receive offers and promotions"
            checked={localPrefs.marketing ?? true}
            onChange={() => handleToggle('marketing')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />

          {/* Sound — PREMIUM */}
          <ToggleRow
            icon={<VolumeUp style={{ color: colors.fourth }} />}
            label="Sound"
            description="Play sounds for notifications"
            checked={localPrefs.sound ?? true}
            onChange={() => handleToggle('sound')}
            locked={!hasAccess}
            saving={saving}
            colors={colors}
          />
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

export default NotificationSettings;
