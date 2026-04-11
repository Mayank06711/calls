import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  AccessTimeOutlined, 
  Computer, 
  PhoneIphone, 
  Tablet, 
  Warning,
  Refresh,
  DevicesOther,
  LocationOn,
  Schedule
} from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors, toRgba } from '../../../../../../../utils/getSubscriptionColors';
import { logoutThunk } from '../../../../../../../redux/thunks/login.thunks';
import { fetchSessionsThunk, revokeSessionThunk, revokeAllSessionsThunk } from '../../../../../../../redux/thunks/session.thunks';
import { useAIContext } from '../../../../../../../context/AIContext';

function SessionSettings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const { data } = useSelector(state => state.settings);
  const { sessions, count, loading: sessionsLoading, revoking } = useSelector(state => state.sessions);
  const lastLoginInfo = data?.lastLoginInfo;
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const countdownRef = useRef(null);
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // AI context for sessions page
  useEffect(() => {
    const otherSessions = sessions?.filter(s => !s.isCurrent) || [];
    const summary = `User is managing active sessions. Total sessions: ${count || 0}. ${otherSessions.length > 0 ? `Other devices: ${otherSessions.map(s => `${s.deviceType || "unknown"} (${s.location || "unknown location"}, last active ${s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString() : "unknown"})`).join("; ")}.` : "No other active sessions."} ${lastLoginInfo ? `Last login: ${lastLoginInfo.device || "unknown device"} from ${lastLoginInfo.location || "unknown location"}.` : ""}`;
    setAIPageContext({ page: "settings/sessions", description: summary });
    return () => clearAIPageContext();
  }, [sessions, count, lastLoginInfo, setAIPageContext, clearAIPageContext]);

  // Fetch sessions on mount
  useEffect(() => {
    dispatch(fetchSessionsThunk());
  }, [dispatch]);
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Countdown timer for logout confirmation
  useEffect(() => {
    if (showLogoutConfirm && countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [showLogoutConfirm, countdown]);

  // Auto-submit when countdown reaches 0
  useEffect(() => {
    if (showLogoutConfirm && countdown === 0 && !isLoggingOut) {
      handleConfirmLogout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLogoutConfirm, countdown]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
  
  const handleLogoutAllSessions = () => {
    setSelectedSession(null);
    setShowLogoutConfirm(true);
    setCountdown(5);
  };
  
  const handleRevokeSession = (session) => {
    setSelectedSession(session);
    setShowLogoutConfirm(true);
    setCountdown(5);
  };
  
  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
    setSelectedSession(null);
    setCountdown(5);
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }
  };
  
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    if (selectedSession) {
      // Revoke specific session
      if (selectedSession.isCurrent) {
        await dispatch(logoutThunk());
      } else {
        await dispatch(revokeSessionThunk(selectedSession.id));
      }
    } else {
      // Logout from current session
      await dispatch(logoutThunk());
    }
    setIsLoggingOut(false);
    setShowLogoutConfirm(false);
    setSelectedSession(null);
  };
  
  const handleRevokeAllOtherSessions = async () => {
    await dispatch(revokeAllSessionsThunk(true));
  };
  
  const handleRefreshSessions = () => {
    dispatch(fetchSessionsThunk());
  };
  
  // Get device icon based on type
  const getDeviceIcon = (device) => {
    if (!device) return <Computer style={{ color: colors.fourth }} />;
    
    switch (device.type) {
      case 'mobile':
        return <PhoneIphone style={{ color: colors.fourth }} />;
      case 'tablet':
        return <Tablet style={{ color: colors.fourth }} />;
      case 'desktop':
        return <Computer style={{ color: colors.fourth }} />;
      default:
        return <DevicesOther style={{ color: colors.fourth }} />;
    }
  };
  
  const getDeviceName = () => {
    if (lastLoginInfo?.device && lastLoginInfo?.browser) {
      return `${lastLoginInfo.browser} on ${lastLoginInfo.device}`;
    }
    const ua = navigator.userAgent;
    const browser = ua.includes('Chrome') ? 'Chrome' : 
                    ua.includes('Firefox') ? 'Firefox' : 
                    ua.includes('Safari') ? 'Safari' : 'Browser';
    const os = ua.includes('Windows') ? 'Windows' : 
               ua.includes('Mac') ? 'Mac' : 
               ua.includes('Linux') ? 'Linux' : 'Device';
    return `${browser} on ${os}`;
  };
  
  // Find current session from sessions list
  const currentSession = sessions.find(s => s.isCurrent);
  const otherSessions = sessions.filter(s => !s.isCurrent);
  
  return (
    <SettingTemplate title="Session Information" icon={<AccessTimeOutlined />}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium dark:text-dark-text text-light-text">Active Sessions</h2>
            <p className="dark:text-gray-400 text-gray-600 text-sm">
              Manage your active sessions across devices ({count} active)
            </p>
          </div>
          <button
            onClick={handleRefreshSessions}
            disabled={sessionsLoading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh sessions"
          >
            <Refresh className={`${sessionsLoading ? 'animate-spin' : ''}`} style={{ color: colors.fourth }} />
          </button>
        </div>
        
        <div className="mt-4">
          <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Current Session</h3>
          <div className="space-y-3">
            {/* Current Session - Real Time */}
            <div 
              className="p-4 border-2 rounded-lg bg-white/5 dark:bg-gray-800/50"
              style={{ borderColor: colors.fourth }}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  {currentSession ? getDeviceIcon(currentSession.device) : getDeviceIcon(null)}
                  <div>
                    <p className="font-medium dark:text-dark-text text-light-text">
                      {currentSession?.device?.description || getDeviceName()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Active now: <span style={{ color: colors.fourth }} className="font-mono">{formatTime(currentTime)}</span>
                    </p>
                    {(currentSession?.location?.city || currentSession?.location?.country) && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <LocationOn fontSize="small" />
                        {[currentSession.location.city, currentSession.location.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                        style={{ backgroundColor: toRgba(colors.fourth, 0.2), color: colors.fourth }}
                      >
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.fourth }}></span>
                        Current Session
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleRevokeSession({ isCurrent: true })}
                  disabled={isLoggingOut || revoking}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Other Sessions */}
          {otherSessions.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium dark:text-dark-text text-light-text">Other Active Sessions ({otherSessions.length})</h3>
                <button
                  onClick={handleRevokeAllOtherSessions}
                  disabled={revoking}
                  className="text-sm px-3 py-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  End All
                </button>
              </div>
              <div className="space-y-3">
                {otherSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="p-4 border rounded-lg bg-white/5 dark:bg-gray-800/50 dark:border-gray-700"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {getDeviceIcon(session.device)}
                        <div>
                          <p className="font-medium dark:text-dark-text text-light-text">
                            {session.device?.description || `${session.device?.browser || 'Unknown'} on ${session.device?.platform || 'Unknown'}`}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Schedule fontSize="small" />
                            <span>Last active: {formatRelativeTime(session.lastActiveAt)}</span>
                          </div>
                          {(session.location?.city || session.location?.country) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <LocationOn fontSize="small" />
                              {[session.location.city, session.location.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Started: {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRevokeSession(session)}
                        disabled={revoking}
                        className="px-3 py-1.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white text-sm transition-colors disabled:opacity-50"
                      >
                        End
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {sessionsLoading && sessions.length === 0 && (
            <div className="mt-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 border rounded-lg dark:border-gray-700 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* No Other Sessions */}
          {!sessionsLoading && sessions.length <= 1 && (
            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm text-green-600 dark:text-green-400 text-center">
                ✓ No other active sessions found. Your account is only logged in on this device.
              </p>
            </div>
          )}
          
          {/* Logout Current Session Button */}
          <button 
            onClick={handleLogoutAllSessions}
            disabled={isLoggingOut || revoking}
            className="mt-6 w-full py-2.5 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Logout from Current Device
          </button>
        </div>
      </div>
      
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: toRgba(colors.fourth, 0.2) }}
              >
                <Warning className="text-3xl text-red-500" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-center mb-2 dark:text-dark-text text-light-text">
              {selectedSession?.isCurrent ? 'Confirm Logout' : selectedSession ? 'End Session' : 'Confirm Logout'}
            </h3>
            
            <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
              {selectedSession?.isCurrent 
                ? 'You will be logged out from this device. Are you sure?'
                : selectedSession 
                  ? `End session on ${selectedSession.device?.description || 'this device'}?`
                  : 'You will be logged out from this device. Are you sure?'
              }
            </p>
            
            {/* Countdown Timer */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                style={{ 
                  border: `4px solid ${colors.fourth}`,
                  color: countdown <= 2 ? '#ef4444' : colors.fourth
                }}
              >
                {countdown}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 py-2.5 border-2 rounded-lg font-medium transition-colors dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut || revoking}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isLoggingOut || revoking ? 'Processing...' : selectedSession?.isCurrent ? 'Logout Now' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingTemplate>
  );
}

export default SessionSettings;