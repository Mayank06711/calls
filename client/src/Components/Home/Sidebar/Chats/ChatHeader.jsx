import PropTypes from 'prop-types';
import {
  VideoCall,
  MoreVert,
  ArrowBack
} from '@mui/icons-material';
import { format } from 'date-fns';
import MessageStatus from './MessageStatus';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import { IconButton, Tooltip } from '@mui/material';

const ChatHeader = ({
  receiverData,
  isTyping,
  onBack,
  onVideoCall,
  onMenuClick,
  lastMessage,
  currentUserId
}) => {
  const colors = useSubscriptionColors();

  const getStatusText = () => {
    if (isTyping) return 'typing...';
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

      <div className="flex-1 flex items-center">
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
          {receiverData.status === 'online' && (
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-light-primary dark:border-dark-primary"
              style={{ 
                backgroundColor: '#22c55e' // Green color for online status
              }}
            />
          )}
        </div>

        <div className="ml-3">
          <div className="font-medium text-light-text dark:text-dark-text">
            {receiverData.name}
          </div>
          
          <div className="text-xs text-light-text/60 dark:text-dark-text/60">
            {getStatusText()}
          </div>
        </div>
      </div>

      <div className="flex-1 items-center space-x-3">
        {/* {showMessageStatus && (
          <MessageStatus status={lastMessage.status} />
        )} */}
       <Tooltip title="Video Call" arrow placement="top">
        
        <IconButton 
          onClick={onVideoCall}
          className="p-2 rounded-full transition-colors duration-200"
          style={{ 
            color: colors.third,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: `${colors.first}20`
            }
          }}
        >
          <VideoCall />
        </IconButton>
        </Tooltip>
        {/* <button 
          onClick={onMenuClick}
          className="p-2 rounded-full transition-colors duration-200"
          style={{ 
            color: colors.third,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: `${colors.first}20`
            }
          }}
        >
          <MoreVert />
        </button> */}
      </div>
    </div>
  );
};

ChatHeader.propTypes = {
  receiverData: PropTypes.shape({
    name: PropTypes.string,
    username: PropTypes.string,
    status: PropTypes.string,
    avatar: PropTypes.string,
    lastSeen: PropTypes.string,
  }).isRequired,
  isTyping: PropTypes.bool,
  onBack: PropTypes.func,
  onVideoCall: PropTypes.func,
  onMenuClick: PropTypes.func,
  lastMessage: PropTypes.object,
  currentUserId: PropTypes.string,
};

export default ChatHeader;