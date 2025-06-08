
import React from 'react';
import { 
  VideoCall, 
  Call, 
  MoreVert, 
  ArrowBack 
} from '@mui/icons-material';
import { format } from 'date-fns';

const ChatHeader = ({ 
  receiverData, 
  isTyping, 
  onBack,
  onVideoCall,
  onVoiceCall,
  onMenuClick 
}) => {
  const getStatusText = () => {
    if (isTyping) return 'typing...';
    if (receiverData.lastSeen) {
      return `last seen ${format(new Date(receiverData.lastSeen), 'HH:mm')}`;
    }
    return receiverData.status || 'offline';
  };

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center">
      <button 
        onClick={onBack}
        className="md:hidden mr-2 text-gray-600"
      >
        <ArrowBack />
      </button>

      <div className="flex-1 flex items-center">
        <div className="relative">
          <img 
            src={receiverData.avatar || '/default-avatar.png'} 
            alt={receiverData.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {receiverData.status === 'online' && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>

        <div className="ml-3">
          <h3 className="font-medium text-gray-900">
            {receiverData.name}
          </h3>
          <p className="text-sm text-gray-500">
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button 
          onClick={onVoiceCall}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <Call />
        </button>
        
        <button 
          onClick={onVideoCall}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <VideoCall />
        </button>
        
        <button 
          onClick={onMenuClick}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <MoreVert />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;