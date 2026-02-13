import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideSessionLimit } from '../../redux/actions/auth.actions';
import { revokeSessionThunk, revokeAllSessionsThunk } from '../../redux/thunks/session.thunks';
import { verifyOtpThunk, verifyEmailOtpThunk, googleAuthThunk } from '../../redux/thunks/login.thunks';
import { IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ComputerIcon from '@mui/icons-material/Computer';

const SessionLimitModal = () => {
  const dispatch = useDispatch();
  const { show, data } = useSelector(state => state.auth.sessionLimit);

  if (!show || !data) return null;

  const { activeSessions, maxAllowed, partialToken, verificationData, subscriptionType } = data;

  const retryLogin = () => {
    if (verificationData?.idToken) {
      dispatch(googleAuthThunk(verificationData.idToken));
    } else if (verificationData?.email) {
      dispatch(verifyEmailOtpThunk(verificationData));
    } else {
      dispatch(verifyOtpThunk(verificationData));
    }
  };

  const handleRevoke = async (sessionId) => {
    const result = await dispatch(revokeSessionThunk(sessionId, partialToken));
    if (result.success) {
       dispatch(hideSessionLimit());
       retryLogin();
    }
  };

  const handleRevokeAll = async () => {
    const result = await dispatch(revokeAllSessionsThunk(false, partialToken));
    if (result.success) {
       dispatch(hideSessionLimit());
       retryLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden m-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
           <div>
             <h3 className="text-xl font-bold text-gray-800">Device Limit Reached</h3>
             <p className="text-sm text-gray-500 mt-1">
               Your {subscriptionType} plan allows {maxAllowed} active devices.
             </p>
           </div>
           <IconButton onClick={() => dispatch(hideSessionLimit())} size="small">
             <CloseIcon />
           </IconButton>
        </div>
        
        {/* Body */}
        <div className="p-6 max-h-[50vh] overflow-y-auto">
           <div className="space-y-4">
             {activeSessions.map((session) => (
                <div key={session.sessionId} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                   <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                         {session.deviceType === 'mobile' ? <PhoneAndroidIcon className="text-blue-500" /> : <ComputerIcon className="text-blue-500" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700 text-sm max-w-[200px] truncate" title={session.device}>{session.device || "Unknown Device"}</p>
                        <div className="flex text-xs text-gray-500 space-x-2 mt-1">
                          <span>{session.ip}</span>
                          <span>•</span>
                          <span>{new Date(session.lastActiveAt || session.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                   </div>
                   <Button 
                     variant="outlined" color="error" size="small"
                     onClick={() => handleRevoke(session.sessionId)}
                   >
                     Sign Out
                   </Button>
                </div>
             ))}
           </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
           <Button 
             onClick={() => dispatch(hideSessionLimit())}
             variant="text" color="inherit"
           >
             Cancel
           </Button>
           <Button 
             onClick={handleRevokeAll}
             variant="contained" color="error"
             startIcon={<LogoutIcon />}
           >
             Sign Out All Devices
           </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionLimitModal;
