import React from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications';
import { IconButton } from '@mui/material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import { useNavigate } from 'react-router-dom';

function Notification() {
    const colors=useSubscriptionColors();
    const navigate = useNavigate();

    const handleClick = (path) => {
      navigate(path);
    };
  return (
    <div >
     <IconButton onClick={() => handleClick("/notifications")}>
     <NotificationsIcon sx={{color:colors.fourth}} />
     </IconButton>
    </div>
  )
}

export default Notification
