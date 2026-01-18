import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { hideNotification } from '../../redux/actions/notification.actions';
import { Alert, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useSubscriptionColors } from '../../utils/getSubscriptionColors';

const getSeverity = (statusCode) => {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 300 && statusCode < 400) return 'info';
  if (statusCode >= 400 && statusCode < 500) return 'warning';
  if (statusCode >= 500) return 'error';
  return 'info';
};

const getIcon = (severity) => {
  switch (severity) {
    case 'success':
      return <CheckCircleOutlineIcon />;
    case 'error':
      return <ErrorOutlineIcon />;
    case 'warning':
      return <WarningAmberIcon />;
    case 'info':
      return <InfoOutlinedIcon />;
    default:
      return <InfoOutlinedIcon />;
  }
};

const Toast = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userId: currentChatUserId } = useParams();
  const colors = useSubscriptionColors();
  const { message, statusCode, visible, metadata } = useSelector((state) => state.notification);
  
  // Auto-dismiss toast if user opens the chat that the notification is about
  useEffect(() => {
    if (visible && metadata?.type === 'chat_message' && metadata?.userId === currentChatUserId) {
      console.log('✅ Auto-dismissing notification - chat is now open');
      dispatch(hideNotification());
    }
  }, [currentChatUserId, visible, metadata, dispatch]);
  
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(hideNotification());
  };
  
  const handleClick = () => {
    // If this is a chat message notification, navigate to that chat
    if (metadata?.type === 'chat_message' && metadata?.userId) {
      console.log('👆 Toast clicked - navigating to chat:', metadata.userId);
      navigate(`/chats/${metadata.userId}`);
      dispatch(hideNotification());
    }
  };

  const severity = getSeverity(statusCode);
  const isChatMessage = metadata?.type === 'chat_message';

  // Dynamic background colors based on notification type
  const getBackgroundColor = () => {
    // Chat message notifications use subscription color
    if (isChatMessage) {
      return colors.fourth;
    }
    // Other notifications use standard severity colors
    switch (severity) {
      case 'success':
        return '#22c55e'; // Green
      case 'error':
        return '#ef4444'; // Red
      case 'warning':
        return '#f59e0b'; // Yellow/Amber
      case 'info':
        return '#3b82f6'; // Blue
      default:
        return undefined; // Use MUI default
    }
  };

  const getHoverColor = () => {
    if (isChatMessage) {
      return colors.third;
    }
    switch (severity) {
      case 'success':
        return '#16a34a'; // Darker green
      case 'error':
        return '#dc2626'; // Darker red
      case 'warning':
        return '#d97706'; // Darker amber
      case 'info':
        return '#2563eb'; // Darker blue
      default:
        return undefined;
    }
  };

  const action = (
    <IconButton
      size="small"
      aria-label="close"
      color="inherit"
      onClick={handleClose}
    >
      <CloseIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Snackbar
      open={visible}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        onClick={handleClick}
        severity={severity}
        variant="filled"
        icon={getIcon(severity)}
        action={action}
        sx={{ 
          minWidth: '300px',
          backgroundColor: getBackgroundColor(),
          cursor: isChatMessage ? 'pointer' : 'default',
          '&:hover': {
            backgroundColor: getHoverColor(),
          },
          '& .MuiAlert-message': {
            flex: 1,
            marginRight: 1
          },
          '& .MuiAlert-icon': {
            marginRight: 1
          }
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;