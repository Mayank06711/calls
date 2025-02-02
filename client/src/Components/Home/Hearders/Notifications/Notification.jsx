import React from 'react'
import NotificationsIcon from '@mui/icons-material/Notifications';
import { IconButton } from '@mui/material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

function Notification() {
    const colors=useSubscriptionColors();
  return (
    <div >
     <IconButton>
     <NotificationsIcon sx={{color:colors.fourth}} />
     </IconButton>
    </div>
  )
}

export default Notification
