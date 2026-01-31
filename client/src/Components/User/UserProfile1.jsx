import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Typography, Container, Chip, Avatar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import "animate.css";
import { fetchUserInfoThunk } from "../../redux/thunks/userInfo.thunks.js";
import { uploadImage } from "../../socket/handleImageUpload.js";
import { showNotification } from "../../redux/actions/index.js";
import { useImageCarousel } from "../../hooks/useImageCarousel.js";

function UserProfile() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [userPhotos, setUserPhotos] = useState([]);
  const {
    data: userInfo,
    loading,
    error,
  } = useSelector((state) => state.userInfo);

  // Use the custom hook for image carousel
  const { currentPhoto, isCarouselActive, toggleCarousel } =
    useImageCarousel(userPhotos);

  useEffect(() => {
    if (userInfo?.photo) {
      // If allPhotos exists, use that
      if (userInfo.photo.allPhotos) {
        setUserPhotos(userInfo.photo.allPhotos);
      }
      // If single photo object, create an array with one photo
      else if (userInfo.photo.url) {
        setUserPhotos([
          {
            url: userInfo.photo.url,
            thumbnail_url: userInfo.photo.thumbnail_url,
          },
        ]);
      }
    }
  }, [userInfo]);

  useEffect(() => {
    dispatch(fetchUserInfoThunk());
  }, [dispatch]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await uploadImage(file, (progress) => {
        setUploadProgress(progress);
      });

      // Handle the upload response
      if (response.status === "success") {
        // Update user photos if available in response
        if (response.data?.allPhotos) {
          setUserPhotos(response.data.allPhotos);
        } else if (response.data?.photo) {
          setUserPhotos([
            {
              url: response.data.photo.url,
              thumbnail_url: response.data.photo.thumbnail_url,
            },
          ]);
        }
      }
      // Show success message from response
      dispatch(
        showNotification(
          response.message || "Profile photo updated successfully",
          response.status || "info"
        )
      );
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadProgress(0);
      // Error notification is handled in uploadImage function
    } finally {
      setIsUploading(false);
    }
  };
  if (loading) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500'></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8 max-w-2xl mx-auto'>
        <div className='text-red-500 text-center'>
          Error loading user information: {error}
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <Container maxWidth='md'>
      <Box
        className='min-h-screen flex flex-col items-center justify-center animate__animated animate__fadeIn'
        sx={{
          textAlign: "center",
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Box
          className='
            animate__animated animate__bounceIn
            p-8 sm:p-12 md:p-16 rounded-2xl shadow-2xl
            backdrop-blur-sm
            transform hover:scale-105 transition-transform duration-300
            bg-gradient-to-r from-rose-50 via-neutral-100 to-rose-50
            border border-rose-100
            w-full max-w-2xl mx-auto
          '
          sx={{
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              background: "linear-gradient(45deg, #fecdd3, #ffe4e6)",
              borderRadius: "1rem",
              zIndex: -1,
              filter: "blur(12px)",
              opacity: 0.4,
            },
          }}
        >
          {/* Profile Avatar with Camera Overlay */}
          <div className='relative w-fit mx-auto mb-4 group'>
            <Avatar
              sx={{
                width: { xs: 100, sm: 120, md: 150 },
                height: { xs: 100, sm: 120, md: 150 },
                margin: "0 auto",
                mb: 4,
                bgcolor: "#fb7185",
                cursor: userPhotos.length > 1 ? "pointer" : "default",
                transition: "transform 0.6s ease-in-out",
                "&:hover": {
                  transform: userPhotos.length > 1 ? "scale(1.05)" : "none",
                },
              }}
              onClick={() => userPhotos.length > 1 && toggleCarousel()}
            >
              {userPhotos.length > 0 ? (
                <>
                  <img
                    src={
                      currentPhoto?.thumbnail_url || userPhotos[0].thumbnail_url
                    }
                    alt={userInfo.fullName}
                    className='w-full h-full object-cover transition-opacity duration-300'
                    style={{
                      opacity: isUploading ? 0.5 : 1,
                    }}
                    onLoad={(e) => {
                      const fullImg = new Image();
                      const fullResUrl = currentPhoto?.url || userPhotos[0].url;
                      fullImg.src = fullResUrl;
                      fullImg.onload = () => {
                        e.target.src = fullResUrl;
                      };
                    }}
                  />
                  {/* Carousel Status Indicator */}
                  {userPhotos.length > 1 && (
                    <div
                      className='absolute top-2 right-2 w-2 h-2 rounded-full'
                      style={{
                        backgroundColor: isCarouselActive
                          ? "#22c55e"
                          : "#ef4444",
                        transition: "background-color 0.3s ease",
                      }}
                      title={
                        isCarouselActive
                          ? "Auto-rotation active"
                          : "Auto-rotation paused"
                      }
                    />
                  )}
                </>
              ) : (
                <PersonIcon sx={{ fontSize: { xs: 60, sm: 80, md: 100 } }} />
              )}
            </Avatar>

            {/* Camera Icon Overlay */}
            <div
              className='absolute inset-0 flex items-center justify-center 
            bg-black bg-opacity-0 group-hover:bg-opacity-50 
            rounded-full transition-all duration-300 cursor-pointer'
              onClick={() => fileInputRef.current?.click()}
            >
              <PhotoCameraIcon
                className='text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                sx={{ fontSize: { xs: 30, sm: 40, md: 50 } }}
              />
            </div>

            {/* Hidden File Input */}
            <input
              type='file'
              ref={fileInputRef}
              className='hidden'
              accept='image/*'
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />

            {/* Upload Progress Overlay */}
            {isUploading && (
              <div className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full'>
                <div className='text-white font-bold text-lg'>
                  {uploadProgress}%
                </div>
              </div>
            )}

            {/* Carousel Indicator */}
            {userPhotos.length > 1 && (
              <div className='absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1'>
                {userPhotos.map((_, index) => (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      (currentPhoto || userPhotos[0]) === userPhotos[index]
                        ? "bg-rose-500"
                        : "bg-rose-200"
                    }`}
                    title={`Photo ${index + 1}${
                      isCarouselActive ? " (Auto-rotating)" : ""
                    }`}
                  />
                ))}
              </div>
            )}
            {/* Carousel Control Tooltip */}
            {userPhotos.length > 1 && (
              <div className='absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-xs text-gray-500'>
                Click avatar to {isCarouselActive ? "pause" : "resume"}{" "}
                auto-rotation
              </div>
            )}
          </div>

          {/* Name and Username */}
          <Typography
            variant='h3'
            className='mb-4 font-bold animate__animated animate__fadeInDown'
            sx={{
              color: "#881337",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            {userInfo.fullName}
          </Typography>

          <Typography
            variant='h5'
            className='mb-6 animate__animated animate__fadeInUp'
            sx={{
              color: "#4a044e",
              fontSize: { xs: "1.25rem", sm: "1.5rem", md: "1.75rem" },
            }}
          >
            @{userInfo.username}
          </Typography>

          {/* Status Chips */}
          <Box className='flex flex-wrap justify-center gap-3 mb-8 animate__animated animate__fadeInUp'>
            <Chip
              label={
                userInfo.isPhoneVerified
                  ? "✓ Phone Verified"
                  : "✗ Phone Not Verified"
              }
              color={userInfo.isPhoneVerified ? "success" : "default"}
              className='bg-green-50'
            />
            <Chip
              label={
                userInfo.isEmailVerified
                  ? "✓ Email Verified"
                  : "✗ Email Not Verified"
              }
              color={userInfo.isEmailVerified ? "primary" : "default"}
              className='bg-blue-50'
            />
            <Chip
              label={userInfo.isExpert ? "Expert" : "Regular User"}
              color={userInfo.isExpert ? "warning" : "default"}
              className='bg-yellow-50'
            />
          </Box>

          {/* User Details Grid */}
          <div className='grid grid-cols-2 gap-4 text-left animate__animated animate__fadeInUp'>
            {[
              { label: "Age", value: `${userInfo.age} years` },
              { label: "Gender", value: userInfo.gender },
              {
                label: "Location",
                value: `${userInfo.city}, ${userInfo.country}`,
              },
              { label: "Phone", value: userInfo.phoneNumber },
              { label: "Member Since", value: formatDate(userInfo.createdAt) },
              {
                label: "Profile Updated",
                value: formatDate(userInfo.updatedAt),
              },
              { label: "Subscription", value: userInfo.isSubscribed },
              {
                label: "Account Status",
                value: userInfo.isActive ? "Active" : "Inactive",
              },
            ].map((item, index) => (
              <div
                key={index}
                className='bg-white/50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow'
              >
                <p className='text-gray-600 text-sm'>{item.label}</p>
                <p className='font-semibold text-gray-800'>{item.value}</p>
              </div>
            ))}
          </div>
        </Box>
      </Box>
    </Container>
  );
}

export default UserProfile;
