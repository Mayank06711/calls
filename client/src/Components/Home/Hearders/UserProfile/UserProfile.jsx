import { Avatar, IconButton } from '@mui/material'
import React from 'react'
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors'

function UserProfile() {
  const colors=useSubscriptionColors();
  return (
    <div>
     <IconButton>
     <Avatar sx={{width:30,height:30,backgroundColor:colors.fourth}}>H</Avatar>
     </IconButton>

    </div>
  )
}

export default UserProfile
