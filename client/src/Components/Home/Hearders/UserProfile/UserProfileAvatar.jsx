import { Avatar, IconButton } from '@mui/material'
import React from 'react'
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors'
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserInfoThunk } from '../../../../redux/thunks/userInfo.thunks';
import { setProfileDataLoading } from '../../../../redux/actions';

function UserProfile() {
  const colors=useSubscriptionColors();
  const navigate=useNavigate();
  const dispatch= useDispatch();
  const userinfo =useSelector((state) => state.userInfo.data);
  const handleClick=(path)=>{
    if(userinfo){
      navigate(path);
      return;
    };
    dispatch(setProfileDataLoading(true));
    navigate(path);
    
    dispatch(fetchUserInfoThunk());
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
