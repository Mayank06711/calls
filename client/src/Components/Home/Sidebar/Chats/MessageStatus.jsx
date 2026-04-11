import PropTypes from 'prop-types';
import { Check, DoneAll, AccessTime, ErrorOutline } from '@mui/icons-material';

const MessageStatus = ({ status, seenColor = '#1E88E5' }) => {
const renderStatus = () => {
  switch (status) {
    case 'sending':
    case 'pending':
      return (
        <AccessTime sx={{ width: 16, height: 16, color: '#9e9e9e' }} />
      );
    case 'failed':
      return (
        <ErrorOutline sx={{ width: 16, height: 16, color: '#f44336' }} />
      );
    case 'sent':
      return (
        <Check sx={{ width: 16, height: 16, color: '#e0e0e0' }} />
      );
    case 'delivered':
      return (
        <DoneAll sx={{ width: 16, height: 16, color: '#9e9e9e' }} />
      );
    case 'seen':
      return (
        <DoneAll sx={{ width: 16, height: 16, color: seenColor }} />
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
  seenColor: PropTypes.string,
};

export default MessageStatus;