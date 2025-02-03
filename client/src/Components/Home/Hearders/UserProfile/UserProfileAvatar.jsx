import { Avatar, IconButton } from '@mui/material'
import React from 'react'
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors'
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchUserInfoThunk } from '../../../../redux/thunks/userInfo.thunks';

function UserProfile() {
  const colors=useSubscriptionColors();
  const navigate=useNavigate();
  const dispatch= useDispatch();
  const handleClick=(path)=>{
    navigate(path);
    dispatch(fetchUserInfoThunk());j
  }
  return (
    <div>
     <IconButton  onClick={() => handleClick("/profile")}>
     <Avatar sx={{width:30,height:30,backgroundColor:colors.fourth}}>H</Avatar>
     </IconButton>

    </div>
  )
}

export default UserProfile
