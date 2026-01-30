import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LockOutlined, VisibilityOff, Visibility } from '@mui/icons-material';
import { Avatar, CircularProgress } from '@mui/material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors, selectSubscriptionType } from '../../../../../../../utils/getSubscriptionColors';
import { useSelector, useDispatch } from 'react-redux';
import { useSocketContext } from '../../../../../../../socket/SocketContext';
import ChatService from '../../../../../../../socket/chatService';
import { fetchSettingsThunk, updatePrivacySettings } from '../../../../../../../redux/thunks/settings.thunk';

function PrivacySettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const { socket } = useSocketContext();
  const subscriptionType = useSelector(selectSubscriptionType);
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const isPremium = ["GOLD", "SILVER", "PLATINUM"].includes(subscriptionType?.toUpperCase());
  const canHide = isPremium && !isExpert;

  const privacyData = useSelector(state => state.settings?.data?.privacy);
  const [localShowOnline, setLocalShowOnline] = useState(privacyData?.showOnlineStatus ?? true);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  const [hiddenChats, setHiddenChats] = useState([]);
  const [loadingHidden, setLoadingHidden] = useState(false);
  const [unhidingId, setUnhidingId] = useState(null);

  useEffect(() => {
    dispatch(fetchSettingsThunk());
  }, [dispatch]);

  // Sync local state when Redux updates
  useEffect(() => {
    if (privacyData?.showOnlineStatus !== undefined) {
      setLocalShowOnline(privacyData.showOnlineStatus);
    }
  }, [privacyData?.showOnlineStatus]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleToggleOnlineStatus = useCallback(() => {
    const newValue = !localShowOnline;
    setLocalShowOnline(newValue);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await dispatch(updatePrivacySettings({ showOnlineStatus: newValue }));
        // Notify the server via socket so it can broadcast status change to other users
        if (socket) {
          socket.emit('privacy:status-changed', { showOnlineStatus: newValue });
        }
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [localShowOnline, dispatch, socket]);

  useEffect(() => {
    if (!canHide || !socket) return;
    const fetchHidden = async () => {
      setLoadingHidden(true);
      try {
        const service = new ChatService(socket);
        const chats = await service.getHiddenChats();
        setHiddenChats(chats);
      } catch {
        setHiddenChats([]);
      }
      setLoadingHidden(false);
    };
    fetchHidden();
  }, [socket, canHide]);

  const handleUnhide = async (chatId) => {
    if (!socket) return;
    setUnhidingId(chatId);
    try {
      const service = new ChatService(socket);
      const success = await service.unhideChat(chatId);
      if (success) {
        setHiddenChats((prev) => prev.filter((c) => c.chatId !== chatId));
      }
    } catch {
      // silent
    }
    setUnhidingId(null);
  };

  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px]
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text cursor-pointer
    focus:outline-none`;

  const selectStyle = {
    borderColor: colors.fourth,
  };

  return (
    <SettingTemplate title="Privacy Settings" icon={<LockOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Control Your Account Privacy</h2>
        <p className="dark:text-gray-400 text-gray-600">Privacy settings content goes here...</p>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Profile Visibility</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Control who can see your profile</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>Everyone</option>
              <option>Friends Only</option>
              <option>Private</option>
            </select>
          </div>

          {!isExpert && (
            <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50 ${saving ? 'opacity-70' : ''}`}>
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Activity Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're active</p>
              </div>
              <label className={`relative inline-flex items-center ${saving ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={localShowOnline}
                  onChange={saving ? undefined : handleToggleOnlineStatus}
                  disabled={saving}
                  readOnly={saving}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          )}
        </div>

        {/* Hidden Chats Section — only for premium, non-expert users */}
        {canHide && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <VisibilityOff sx={{ fontSize: 20, color: colors.third }} />
              <h3 className="font-medium dark:text-dark-text text-light-text">Hidden Chats</h3>
            </div>

            {loadingHidden ? (
              <div className="flex justify-center py-4">
                <CircularProgress size={20} sx={{ color: colors.fourth }} />
              </div>
            ) : hiddenChats.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hidden chats</p>
            ) : (
              <div className="space-y-2">
                {hiddenChats.map((chat) => (
                  <div
                    key={chat.chatId}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={chat.otherUser?.profilePhoto?.url}
                        sx={{ width: 32, height: 32, bgcolor: colors.third }}
                      >
                        {chat.otherUser?.fullName?.[0] || "?"}
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium dark:text-dark-text text-light-text">
                          {chat.otherUser?.fullName || chat.otherUser?.username || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{chat.otherUser?.username || "—"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnhide(chat.chatId)}
                      disabled={unhidingId === chat.chatId}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all hover:scale-105 disabled:opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`,
                      }}
                    >
                      {unhidingId === chat.chatId ? (
                        <CircularProgress size={12} sx={{ color: "white" }} />
                      ) : (
                        <>
                          <Visibility sx={{ fontSize: 14 }} />
                          Unhide
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
        .peer:checked + div {
          background-color: ${colors.fourth} !important;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default PrivacySettings;
