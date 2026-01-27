import React from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications';
import { IconButton, Badge } from '@mui/material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../../../hooks/useNotifications';

function Notification() {
    const colors=useSubscriptionColors();
    const navigate = useNavigate();
    const { unreadCount } = useNotifications();

    const handleClick = (path) => {
      navigate(path);
    };
  return (
    <div >
     <IconButton onClick={() => handleClick("/notifications")}>
      <Badge
        badgeContent={unreadCount}
        max={99}
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: colors.fourth,
            color: '#fff',
            fontSize: '0.65rem',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px'
          }
        }}
      >
        <NotificationsIcon sx={{color:colors.fourth}} />
      </Badge>
     </IconButton>
    </div>
  )
}

export default Notification
