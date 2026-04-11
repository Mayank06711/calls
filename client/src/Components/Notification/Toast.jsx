import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { hideNotification } from '../../redux/actions/notification.actions';
import { Alert, Snackbar, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { Check, Close } from '@mui/icons-material';
import { useSubscriptionColors } from '../../utils/getSubscriptionColors';
import { playNotificationSound } from '../../utils/notificationSound';

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
  const prevVisibleRef = useRef(false);

  // Play notification sound only when metadata.playSound is true
  useEffect(() => {
    if (visible && !prevVisibleRef.current && metadata?.playSound) {
      playNotificationSound();
    }
    prevVisibleRef.current = visible;
  }, [visible, metadata]);

  // Auto-dismiss toast if user opens the chat that the notification is about
  useEffect(() => {
    if (visible && metadata?.type === 'chat_message' && metadata?.userId === currentChatUserId) {
      console.log('Auto-dismissing notification - chat is now open');
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
    // Chat message notification → navigate to that chat
    if (metadata?.type === 'chat_message' && metadata?.userId) {
      navigate(`/chats/${metadata.userId}`);
      dispatch(hideNotification());
      return;
    }
    // Chat request notification → navigate to /chats (requests section)
    if (metadata?.type === 'chat_request') {
      navigate('/chats');
      dispatch(hideNotification());
    }
  };

  // Accept/Decline handlers for chat request toasts
  const handleAcceptFromToast = (e) => {
    e.stopPropagation();
    if (metadata?.requestId) {
      window.dispatchEvent(new CustomEvent('chat-request:accept-from-toast', {
        detail: { requestId: metadata.requestId, sender: metadata.sender },
      }));
    }
    dispatch(hideNotification());
  };

  const handleDeclineFromToast = (e) => {
    e.stopPropagation();
    if (metadata?.requestId) {
      window.dispatchEvent(new CustomEvent('chat-request:decline-from-toast', {
        detail: { requestId: metadata.requestId },
      }));
    }
    dispatch(hideNotification());
  };

  const severity = getSeverity(statusCode);
  const isChatMessage = metadata?.type === 'chat_message';
  const isChatRequest = metadata?.type === 'chat_request';
  const isClickable = isChatMessage || isChatRequest;

  // Dynamic background colors based on notification type
  const getBackgroundColor = () => {
    if (isChatMessage || isChatRequest) {
      return colors.fourth;
    }
    switch (severity) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      default:
        return undefined;
    }
  };

  const getHoverColor = () => {
    if (isChatMessage || isChatRequest) {
      return colors.third;
    }
    switch (severity) {
      case 'success':
        return '#16a34a';
      case 'error':
        return '#dc2626';
      case 'warning':
        return '#d97706';
      case 'info':
        return '#2563eb';
      default:
        return undefined;
    }
  };

  // Build the action area — close button, plus Accept/Decline for chat requests
  const actionContent = isChatRequest ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Check sx={{ fontSize: 14 }} />}
        onClick={handleAcceptFromToast}
        sx={{
          color: '#fff',
          borderColor: 'rgba(255,255,255,0.5)',
          fontSize: '0.7rem',
          textTransform: 'none',
          minWidth: 0,
          px: 1,
          py: 0.25,
          '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.15)' },
        }}
      >
        Accept
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Close sx={{ fontSize: 14 }} />}
        onClick={handleDeclineFromToast}
        sx={{
          color: '#fff',
          borderColor: 'rgba(255,255,255,0.5)',
          fontSize: '0.7rem',
          textTransform: 'none',
          minWidth: 0,
          px: 1,
          py: 0.25,
          '&:hover': { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.15)' },
        }}
      >
        Decline
      </Button>
      <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </div>
  ) : (
    <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
      <CloseIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Snackbar
      open={visible}
      autoHideDuration={isChatRequest ? 10000 : 5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ zIndex: 10001 }}
    >
      <Alert
        onClose={handleClose}
        onClick={handleClick}
        severity={severity}
        variant="filled"
        icon={getIcon(severity)}
        action={actionContent}
        sx={{
          minWidth: isChatRequest ? '360px' : '300px',
          backgroundColor: getBackgroundColor(),
          cursor: isClickable ? 'pointer' : 'default',
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
