import { Avatar, Chip } from "@mui/material";
import React, { useRef, useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { useSelector } from "react-redux";
import "ldrs/ripples";

function UserInfo() {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarImage, setAvatarImage] = useState(null);
  const colors = useSubscriptionColors();
  const userInfo = useSelector((state) => state.userInfo);

  const userData = userInfo?.data || {};

  const handleFileUpload = async (file) => {
    if (!file) return;

    try {
      setIsUploading(true);

      // Create a FileReader to preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target.result);
      };
      reader.readAsDataURL(file);

      // Simulate upload progress (replace with actual upload logic)
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Add your actual upload logic here
      // const formData = new FormData();
      // formData.append('avatar', file);
      // await axios.post('/api/upload-avatar', formData, {
      //   onUploadProgress: (progressEvent) => {
      //     const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      //     setUploadProgress(progress);
      //   }
      // });
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
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
              <Avatar
                sx={{
                  width: { xs: 100, sm: 120, md: 150 },
                  height: { xs: 100, sm: 120, md: 150 },
                  margin: "0 auto",
                  background: avatarImage
                    ? "none"
                    : `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`,
                  boxShadow: "0 8px 25px 0 rgba(31, 38, 135, 0.20)",
                }}
                src={avatarImage}
              >
                {!avatarImage && (
                  <PersonIcon
                    sx={{
                      fontSize: { xs: 60, sm: 80, md: 100 },
                      color: colors.fourth,
                    }}
                  />
                )}
              </Avatar>

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
