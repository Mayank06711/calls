import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hideNotification } from '../../redux/actions/notification.actions';
import { Alert, Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
  const { message, statusCode, visible } = useSelector((state) => state.notification);
  
  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(hideNotification());
  };

  const severity = getSeverity(statusCode);

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
        severity={severity}
        variant="filled"
        icon={getIcon(severity)}
        action={action}
        sx={{ 
          minWidth: '300px',
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