
import React from 'react';
import { Check, DoneAll } from '@mui/icons-material';

const MessageStatus = ({ status }) => {
  const renderStatus = () => {
    switch (status) {
      case 'sent':
        return (
          <Check 
            className="w-4 h-4 text-gray-200" 
          />
        );
      case 'delivered':
        return (
          <DoneAll 
            className="w-4 h-4 text-gray-200" 
          />
        );
      case 'seen':
        return (
          <DoneAll 
            className="w-4 h-4 text-blue-400" 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center">
      {renderStatus()}
    </div>
  );
};

export default MessageStatus;