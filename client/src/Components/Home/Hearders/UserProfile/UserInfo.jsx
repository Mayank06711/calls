import { Avatar, Chip } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { useSelector,useDispatch } from "react-redux";
import "ldrs/ripples";
import { uploadImage } from "../../../../socket/handleImageUpload";
import { setUserInfo } from "../../../../redux/actions/userInfo.actions";


function UserInfo() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarImage, setAvatarImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const colors = useSubscriptionColors();
  const userInfo = useSelector((state) => state.userInfo);

  const userData = userInfo?.data || {};
  // First try to get thumbnail (for faster loading), then fallback to full URL
  const userThumbnailUrl = userData?.photo?.thumbnailUrl || null;
  const userFullImageUrl = userData?.photo?.url || null;

  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(userThumbnailUrl);

  // If we have both a thumbnail and full image, preload the full image
  useEffect(() => {
    if (
      userThumbnailUrl &&
      userFullImageUrl &&
      userThumbnailUrl !== userFullImageUrl
    ) {
      setIsImageLoading(true);
      setCurrentDisplayUrl(userThumbnailUrl);

      const fullImg = new Image();
      fullImg.onload = () => {
        setCurrentDisplayUrl(userFullImageUrl);
        setIsImageLoading(false);
      };
      fullImg.onerror = () => {
        // Keep using thumbnail if full image fails to load
        setIsImageLoading(false);
      };
      fullImg.src = userFullImageUrl;
    } else if (userFullImageUrl) {
      setCurrentDisplayUrl(userFullImageUrl);
      setIsImageLoading(false);
    } else if (userThumbnailUrl) {
      setCurrentDisplayUrl(userThumbnailUrl);
      setIsImageLoading(false);
    } else {
      setCurrentDisplayUrl(null);
      setIsImageLoading(false);
    }
  }, [userThumbnailUrl, userFullImageUrl]);

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create a FileReader to preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target.result);
      };
      reader.readAsDataURL(file);

      // Start the animation to smoothly increase progress
      let animationInterval;
      let targetProgress = 0;

      // Function to smoothly animate progress
      const animateProgress = () => {
        animationInterval = setInterval(() => {
          setUploadProgress((prev) => {
            // If we've reached the target, don't increment further
            if (prev >= targetProgress) return prev;
            // If we're getting close to target, slow down
            if (prev >= targetProgress - 5) return prev + 0.5;
            // Normal increment
            return prev + 1;
          });
        }, 100);
      };

      // Start initial animation to 10%
      targetProgress = 10;
      animateProgress();

      // Use the uploadImage function with the progress callback
      const uploadedResponse = await uploadImage(file, (progress) => {
        // Clear existing interval
        clearInterval(animationInterval);

        if (progress === 10) {
          // When upload has started, animate to 99%
          targetProgress = 99;
          animateProgress();
        } else if (progress === 100) {
          // When complete, jump to 100%
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
          }, 500); // Short delay to show 100% before hiding
        }
      });

            // Update Redux store with the new photo URLs
            if (uploadedResponse && uploadedResponse.status === "success") {
              const { url, thumbnail_url } = uploadedResponse.data.currentPhoto;
              
              // Create a new userData object with updated photo
              const updatedUserData = {
                ...userData,
                photo: {
                  ...userData.photo,
                  url: url,
                  thumbnailUrl: thumbnail_url
                }
              };
              
              // Update Redux store with new data
              dispatch(setUserInfo(updatedUserData));
              
              // Set the current display URL to the thumbnail for faster display
              setCurrentDisplayUrl(thumbnail_url);
              
              // Start the process to load the full image
              if (url !== thumbnail_url) {
                setIsImageLoading(true);
                const fullImg = new Image();
                fullImg.onload = () => {
                  setCurrentDisplayUrl(url);
                  setIsImageLoading(false);
                };
                fullImg.src = url;
              }
              
              // Clear the temporary avatar preview since we're now using the uploaded image
              setAvatarImage(null);
              
              console.log("Avatar updated successfully", uploadedResponse);
            }
      
      
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(animationInterval);
    }
  };

  const renderStatusChip = (label, status, color = "default") => (
    <Chip
      label={`${label}: ${status}`}
      size="small"
      color={color}
      variant="outlined"
      sx={{
        borderColor: colors.fourth,
        color: colors.fourth,
        "& .MuiChip-label": {
          fontSize: "0.75rem",
        },
      }}
    />
  );

  return (
    <div className="flex flex-col bg-transparent dark:text-dark-text text-light-text h-auro w-[600px] rounded-md">
      {/* avatar section */}

      <div className="w-full flex flex-col justify-center items-start p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20">
        <div className="flex justify-start items-center p-2 gap-4 ">
          <div className="relative w-fit h-fit group">
            {/* Add active status indicator */}
            {userData.isActive && (
              <div className="absolute top-2 right-2 z-10">
                <l-ripples
                  size="30"
                  speed="4"
                  color="rgba(34,197,94,1)"
                ></l-ripples>
              </div>
            )}
            {/* Avatar with progressive loading */}
            <div className="relative">
              <Avatar
                sx={{
                  width: { xs: 100, sm: 120, md: 150 },
                  height: { xs: 100, sm: 120, md: 150 },
                  margin: "0 auto",
                  background:
                    avatarImage || currentDisplayUrl
                      ? "none"
                      : `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`,
                  boxShadow: "0 8px 25px 0 rgba(31, 38, 135, 0.20)",
                  filter: isImageLoading ? "blur(5px)" : "none",
                  transition: "filter 0.3s ease-out",
                }}
                src={avatarImage || currentDisplayUrl}
              >
                {!avatarImage && !currentDisplayUrl && (
                  <PersonIcon
                    sx={{
                      fontSize: { xs: 60, sm: 80, md: 100 },
                      color: colors.fourth,
                    }}
                  />
                )}
              </Avatar>

              {/* Loading indicator for image */}
              {isImageLoading && !isUploading && currentDisplayUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Camera Icon Overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center 
                 bg-black/0 group-hover:bg-black/30
                 rounded-full transition-all duration-300 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoCameraIcon
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                sx={{
                  fontSize: { xs: 30, sm: 40, md: 50 },
                  color: colors.first,
                  filter: "drop-shadow(0 0 8px rgba(255,255,255,0.5))",
                }}
              />
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />

            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                <div className="text-white font-bold text-lg drop-shadow-glow">
                  {uploadProgress}%
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h2
              className="text-2xl font-semibold bg-gradient-to-r from-[colors.fourth] to-[colors.third] bg-clip-text text-transparent"
              style={{ color: colors.fourth }}
            >
              {userData.fullName || "No Name"}
            </h2>
            <div className="mt-2 flex gap-2">
              <Chip
                label={`Email ${userData.isEmailVerified ? "✓" : "✗"}`}
                size="small"
                color={userData.isEmailVerified ? "success" : "default"}
                variant="filled"
                sx={{
                  height: "20px",
                  backgroundColor: userData.isEmailVerified
                    ? undefined
                    : "#6B7280",
                  "& .MuiChip-label": {
                    fontSize: "0.60rem",
                    padding: "0 10px",
                  },
                }}
              />
              <Chip
                label={`Phone ${userData.isPhoneVerified ? "✓" : "✗"}`}
                size="small"
                color={userData.isPhoneVerified ? "success" : "default"}
                variant="filled"
                sx={{
                  height: "20px",
                  backgroundColor: userData.isPhoneVerified
                    ? undefined
                    : "#6B7280",
                  "& .MuiChip-label": {
                    fontSize: "0.60rem",
                    padding: "0 10px",
                  },
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center m-auto">
          <div className="flex items-center">
            {userData.isActive ? (
              <div className="flex items-center gap-1">
                <l-ripples
                  size="30"
                  speed="4"
                  color="rgba(34,197,94,1)"
                ></l-ripples>
                <span className="text-green-500 font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-500 font-medium">Inactive</span>
              </div>
            )}
          </div>
          {renderStatusChip("Role", userData.isExpert ? "Expert" : "User")}
          {renderStatusChip(
            "Subscription",
            userData.isSubscribed ? "Premium" : "Free"
          )}
          {renderStatusChip(
            "MFA",
            userData.isMFAEnabled ? "Enabled" : "Disabled"
          )}
        </div>
      </div>

      {/* user Information secrtion */}
      <div className="flex-1 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Username
              </span>
              <span className="font-medium text-xs truncate">
                {userData.username || "N/A"}
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Location
              </span>
              <span className="font-medium text-xs truncate">
                {userData.city && userData.country
                  ? `${userData.city}, ${userData.country}`
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Contact
              </span>
              <span className="font-medium text-xs truncate">
                {userData.phoneNumber || "N/A"}
              </span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                Member Since
              </span>
              <span className="font-medium text-xs truncate">
                {userData.createdAt
                  ? new Date(userData.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserInfo;
