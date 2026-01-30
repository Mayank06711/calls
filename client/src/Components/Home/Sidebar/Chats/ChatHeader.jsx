import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  VideoCall,
  MoreVert,
  ArrowBack,
  Star,
  Checklist,
  Block,
  VolunteerActivism,
  Flag,
  StarRate,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MessageStatus from './MessageStatus';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { makeRequest } from '../../../../utils/apiHandlers';
import ExpertBlockModal from './ExpertBlockModal';
import TipExpertModal from './TipExpertModal';
import ComplaintModal from './ComplaintModal';
import RateExpertModal from './RateExpertModal';
import ExpertProfilePopup from './ExpertProfilePopup';

const ChatHeader = ({
  receiverData,
  isTyping,
  onBack,
  onVideoCall,
  onMenuClick,
  onSelectMessages,
  lastMessage,
  currentUserId,
  isExpert,
  chatId,
  messages,
}) => {
  const colors = useSubscriptionColors();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  // Live rating state — fetched from server so it updates after user rates
  const receiverId = receiverData._id || receiverData.id;
  const [liveRating, setLiveRating] = useState({
    averageRating: receiverData.averageRating,
    totalRatings: receiverData.totalRatings,
  });

  const fetchRating = useCallback(async () => {
    if (!receiverId || !receiverData.isExpert) return;
    const res = await makeRequest("GET", `/api/v1/feedback/expert/${receiverId}/rating`);
    if (res?.error) return; // silent — fall back to prop values
    // res.data is { success, data: { averageRating, totalRatings } }
    const rating = res?.data?.data || res?.data;
    if (rating) {
      setLiveRating({
        averageRating: rating.averageRating || 0,
        totalRatings: rating.totalRatings || 0,
      });
    }
  }, [receiverId, receiverData.isExpert]);

  // Fetch on mount
  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  const getStatusText = () => {
    if (isTyping) return 'typing...';
    if (receiverData.status === 'hidden') return 'away';
    if (receiverData.status === 'online') return 'online';
    if (receiverData.lastSeen) {
      return `last seen ${format(new Date(receiverData.lastSeen), 'HH:mm')}`;
    }
    return receiverData.status || 'offline';
  };

  // Show message status for last message if sent by current user
  const showMessageStatus = lastMessage && lastMessage.senderId === currentUserId;
 // Get first letter of name for avatar fallback
 const getInitial = () => {
  return receiverData.name ? receiverData.name.charAt(0).toUpperCase() : '?';
};

  return (
    <>
      <div className="px-4 py-3 bg-light-primary dark:bg-dark-primary flex items-center">
        {/* Back button - only visible on mobile */}
        {onBack && (
          <IconButton
            onClick={onBack}
            className="md:hidden mr-2"
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: colors.fourth
            }}
          >
            <ArrowBack />
          </IconButton>
        )}

        <div
          className={`flex-1 flex items-center ${receiverData.isExpert ? 'cursor-pointer' : ''}`}
          onClick={receiverData.isExpert ? () => setShowProfilePopup(true) : undefined}
        >
          <div className="relative">
          {receiverData.avatar ? (
              <img
                src={receiverData.avatar}
                alt={receiverData.name}
                className="w-10 h-10 rounded-full object-cover ring-2"
                style={{
                  ringColor: colors.third
                }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold "
                style={{
                  color: colors.third,
                  borderColor: colors.second,
                  borderWidth: '2px',
                  borderStyle: 'solid'
                }}
              >
                {getInitial()}
              </div>
            )}
            {(receiverData.status === 'online' || receiverData.status === 'hidden') && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-light-primary dark:border-dark-primary"
                style={{
                  backgroundColor: receiverData.status === 'online' ? '#22c55e' : '#eab308'
                }}
              />
            )}
          </div>

          <div className="ml-3">
            <div className="flex items-center gap-2">
              <span className="font-medium text-light-text dark:text-dark-text">
                {receiverData.name}
              </span>
              {receiverData.isExpert && (
                <span className="flex items-center gap-0.5 text-xs" style={{ color: colors.fourth }}>
                  <Star sx={{ fontSize: 14, color: '#f59e0b' }} />
                  <span>{(liveRating.averageRating ?? receiverData.averageRating)?.toFixed(1) || '0.0'}</span>
                  <span className="text-light-text/40 dark:text-dark-text/40">({liveRating.totalRatings ?? receiverData.totalRatings ?? 0})</span>
                </span>
              )}
            </div>

            <div className="text-xs text-light-text/60 dark:text-dark-text/60">
              {getStatusText()}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 mr-10">
          <Tooltip title={isExpert ? "Request Video Call" : "Video Call"} arrow placement="top">
            <IconButton
              onClick={onVideoCall}
              className="p-2 rounded-full transition-colors duration-200"
              style={{ color: colors.third, backgroundColor: 'transparent' }}
            >
              <VideoCall />
            </IconButton>
          </Tooltip>

          {/* Three-dot menu for all other actions */}
          <Tooltip title="More options" arrow placement="top">
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: colors.third }}
            >
              <MoreVert />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: 'var(--color-dark-primary, #1e293b)',
                  color: 'var(--color-dark-text, #e2e8f0)',
                  borderRadius: '12px',
                  minWidth: 180,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.08)',
                },
              },
            }}
          >
            {/* User chatting with expert: Rate, Tip, Report */}
            {receiverData.isExpert && !isExpert && [
              <MenuItem key="rate" onClick={() => { setMenuAnchor(null); setShowRateModal(true); }}>
                <ListItemIcon><StarRate sx={{ fontSize: 20, color: '#f59e0b' }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Rate Expert</ListItemText>
              </MenuItem>,
              <MenuItem key="tip" onClick={() => { setMenuAnchor(null); setShowTipModal(true); }}>
                <ListItemIcon><VolunteerActivism sx={{ fontSize: 20, color: colors.third }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Support Expert</ListItemText>
              </MenuItem>,
              <MenuItem key="report" onClick={() => { setMenuAnchor(null); setShowComplaintModal(true); }}>
                <ListItemIcon><Flag sx={{ fontSize: 20, color: '#ef4444' }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Report Expert</ListItemText>
              </MenuItem>,
            ]}

            {/* Expert chatting with user: Block */}
            {isExpert && !receiverData.isExpert && (
              <MenuItem onClick={() => { setMenuAnchor(null); setShowBlockModal(true); }}>
                <ListItemIcon><Block sx={{ fontSize: 20, color: '#ef4444' }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Block User</ListItemText>
              </MenuItem>
            )}

            {/* Select messages */}
            {onSelectMessages && (
              <MenuItem onClick={() => { setMenuAnchor(null); onSelectMessages(); }}>
                <ListItemIcon><Checklist sx={{ fontSize: 20, color: colors.third }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontSize: 14 }}>Select Messages</ListItemText>
              </MenuItem>
            )}
          </Menu>
        </div>
      </div>

      {/* Modals */}
      {showBlockModal && receiverId && (
        <ExpertBlockModal
          userId={receiverId}
          userName={receiverData.name}
          chatId={chatId}
          messages={messages}
          onClose={() => setShowBlockModal(false)}
        />
      )}
      {showTipModal && receiverId && (
        <TipExpertModal
          expertId={receiverId}
          expertName={receiverData.name}
          onClose={() => setShowTipModal(false)}
        />
      )}
      {showComplaintModal && receiverId && (
        <ComplaintModal
          expertId={receiverId}
          expertName={receiverData.name}
          chatId={chatId}
          messages={messages}
          onClose={() => setShowComplaintModal(false)}
        />
      )}
      {showRateModal && receiverId && (
        <RateExpertModal
          expertId={receiverId}
          expertName={receiverData.name}
          onClose={(rated) => {
            setShowRateModal(false);
            if (rated) fetchRating();
          }}
        />
      )}
      {showProfilePopup && receiverId && receiverData.isExpert && (
        <ExpertProfilePopup
          expertId={receiverId}
          expertName={receiverData.name}
          onClose={() => setShowProfilePopup(false)}
        />
      )}
    </>
  );
};

ChatHeader.propTypes = {
  receiverData: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    name: PropTypes.string,
    username: PropTypes.string,
    status: PropTypes.string,
    avatar: PropTypes.string,
    lastSeen: PropTypes.string,
    isExpert: PropTypes.bool,
    averageRating: PropTypes.number,
    totalRatings: PropTypes.number,
  }).isRequired,
  isTyping: PropTypes.bool,
  onBack: PropTypes.func,
  onVideoCall: PropTypes.func,
  onMenuClick: PropTypes.func,
  onSelectMessages: PropTypes.func,
  lastMessage: PropTypes.object,
  currentUserId: PropTypes.string,
  isExpert: PropTypes.bool,
  chatId: PropTypes.string,
  messages: PropTypes.array,
};

export default ChatHeader;
