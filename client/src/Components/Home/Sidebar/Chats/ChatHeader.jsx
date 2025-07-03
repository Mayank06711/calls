import PropTypes from 'prop-types';
import { 
  VideoCall, 
  Call, 
  MoreVert, 
  ArrowBack 
} from '@mui/icons-material';
import { format } from 'date-fns';
import MessageStatus from './MessageStatus';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

const ChatHeader = ({ 
  receiverData, 
  isTyping, 
  onBack,
  onVideoCall,
  onVoiceCall,
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

  return (
    <div className="px-4 py-3 bg-light-primary dark:bg-dark-primary border-b border-light-secondary/20 dark:border-dark-secondary/20 flex items-center">
      <button 
        onClick={onBack}
        className="md:hidden mr-2 text-light-text/70 dark:text-dark-text/70 hover:text-light-text dark:hover:text-dark-text"
      >
        <ArrowBack />
      </button>

      <div className="flex-1 flex items-center">
        <div className="relative">
          <img 
            src={receiverData.avatar || '/default-avatar.png'} 
            alt={receiverData.name}
            className="w-10 h-10 rounded-full object-cover ring-2"
            style={{ 
              ringColor: colors.third 
            }}
          />
          {receiverData.status === 'online' && (
            <span 
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-light-primary dark:border-dark-primary"
              style={{ 
                backgroundColor: colors.fourth 
              }}
            />
          )}
        </div>

        <div className="ml-3">
          <h3 className="font-medium text-light-text dark:text-dark-text">
            {receiverData.name}
          </h3>
          {receiverData.username && (
            <p 
              className="text-xs"
              style={{ 
                color: colors.fourth 
              }}
            >
              @{receiverData.username}
            </p>
          )}
          <p className="text-sm text-light-text/60 dark:text-dark-text/60">
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {showMessageStatus && (
          <MessageStatus status={lastMessage.status} />
        )}
        <button 
          onClick={onVoiceCall}
          className="p-2 rounded-full transition-colors duration-200"
          style={{ 
            color: colors.third,
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: `${colors.first}20` // 20 is for 20% opacity
            }
          }}
        >
          <Call />
        </button>
        
        <button 
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
        </button>
        
        <button 
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
        </button>
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
  onVoiceCall: PropTypes.func,
  onMenuClick: PropTypes.func,
  lastMessage: PropTypes.object,
  currentUserId: PropTypes.string,
};

export default ChatHeader;