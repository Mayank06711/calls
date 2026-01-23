import PropTypes from 'prop-types';
import { Check, DoneAll, AccessTime, ErrorOutline } from '@mui/icons-material';

const MessageStatus = ({ status }) => {
const renderStatus = () => {
  switch (status) {
    case 'pending':
      return (
        <AccessTime sx={{ width: 16, height: 16, color: 'gray.400' }} />
      );
    case 'failed':
      return (
        <ErrorOutline sx={{ width: 16, height: 16, color: 'red.500' }} />
      );
    case 'sent':
      return (
        <Check sx={{ width: 16, height: 16 }} />
      );
    case 'delivered':
      return (
        <DoneAll sx={{ width: 16, height: 16 }} />
      );
    case 'seen':
      return (
        <DoneAll sx={{ width: 16, height: 16, color: 'blue.400' }} />
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