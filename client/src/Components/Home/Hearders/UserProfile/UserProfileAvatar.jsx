import { Avatar, IconButton } from '@mui/material'
import React, { useState, useEffect } from 'react'
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors'
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserInfoThunk } from '../../../../redux/thunks/userInfo.thunks';
import { setProfileDataLoading } from '../../../../redux/actions';

function UserProfile() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  let userInfo = useSelector((state) => state.userInfo.data);
  
  // State to manage image loading
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(null);
  // Extract photo URLs from user data
  const userThumbnailUrl = userInfo?.photo?.thumbnailUrl || null;
  const userFullImageUrl = userInfo?.photo?.url || null;
  
  // Handle progressive image loading
  useEffect(() => {
    if (userThumbnailUrl && userFullImageUrl && userThumbnailUrl !== userFullImageUrl) {
      // Start with thumbnail for faster initial loading
      setCurrentDisplayUrl(userThumbnailUrl);
      setIsImageLoading(true);
      // Preload the full-quality image
      const fullImg = new Image();
      fullImg.onload = () => {
        setCurrentDisplayUrl(userFullImageUrl);
        setIsImageLoading(false);
      };
      fullImg.onerror = () => {
        // Keep thumbnail if full image fails to load
        setIsImageLoading(false);
      };
      fullImg.src = userFullImageUrl;
    } else if (userFullImageUrl) {
      // If only full URL exists, use that
      setCurrentDisplayUrl(userFullImageUrl);
      setIsImageLoading(false);
    } else if (userThumbnailUrl) {
      // If only thumbnail exists, use that
      setCurrentDisplayUrl(userThumbnailUrl);
      setIsImageLoading(false);
    } else {
      // No image available
      setCurrentDisplayUrl(null);
      setIsImageLoading(false);
    }
  }, [userThumbnailUrl, userFullImageUrl]);
  
  const getInitial = () => {
    const fullName = localStorage.getItem('fullName');
    if (fullName) {
      return fullName.charAt(0).toUpperCase();
    }
    return 'U';
  };
  
  const handleClick = (path) => {
    if (userInfo) {
      navigate(path);
      return;
    };
    dispatch(setProfileDataLoading(true));
    navigate(path);
    
    dispatch(fetchUserInfoThunk());
  }

  return (
    <div className='tour10'>
      <IconButton onClick={() => handleClick("/profile")}>
        <div className="relative">
          <Avatar 
            sx={{
              width: 30,
              height: 30,
              backgroundColor: currentDisplayUrl ? 'transparent' : colors.fourth,
              filter: isImageLoading ? 'blur(2px)' : 'none',
              transition: 'filter 0.3s ease-out',
            }}
            src={currentDisplayUrl}
          >
            {!currentDisplayUrl && getInitial()}
          </Avatar>
          
          {/* Optional: Add loading indicator for very slow connections */}
          {isImageLoading && currentDisplayUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </IconButton>
    </div>
  )
}

export default UserProfile