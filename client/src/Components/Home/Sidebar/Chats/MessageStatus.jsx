import PropTypes from 'prop-types';
import { Check, DoneAll, AccessTime, ErrorOutline } from '@mui/icons-material';

const MessageStatus = ({ status }) => {
  const renderStatus = () => {
    switch (status) {
      case 'pending':
        return (
          <AccessTime className="w-4 h-4 text-gray-400" />
        );
      case 'failed':
        return (
          <ErrorOutline className="w-4 h-4 text-red-500" />
        );
      case 'sent':
        return (
          <Check className="w-4 h-4 text-gray-200" />
        );
      case 'delivered':
        return (
          <DoneAll className="w-4 h-4 text-gray-200" />
        );
      case 'seen':
        return (
          <DoneAll className="w-4 h-4 text-blue-400" />
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

MessageStatus.propTypes = {
  status: PropTypes.string.isRequired,
};

export default MessageStatus;