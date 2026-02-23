import React, { useState, useEffect, useCallback } from "react";
import Bowser from "bowser";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Typography,
  Box,
  Slide,
} from "@mui/material";
import { Close, CloudUpload } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { feedbackClick, showNotification } from "../../redux/actions";
import { fetchUserLocation } from "../../helper/locatonPicker";
import { submitBugFeedbackThunk } from "../../redux/thunks/feedback.thunks";

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const Feedback = () => {
  const [category, setCategory] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const isOpen = useSelector((state) => state.isOpenFeedback);
  const userId = useSelector((state) => state.auth.userId);
  const dispatch = useDispatch();
  const storedDarkMode = localStorage.getItem("isDarkMode");

  const onClose = () => {
    dispatch(feedbackClick(false));
  };

  // Check for dark mode preference from localStorage
  useEffect(() => {
    console.log("stored darknode", storedDarkMode);
    if (storedDarkMode !== null) {
      setIsDarkMode(storedDarkMode === "true");
      // Apply dark mode class to document for Tailwind
      if (storedDarkMode === "true") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to light mode if not set
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, [storedDarkMode]);

  // Memoized function to get system information
  const getSystemInfo = useCallback(() => {
    const browser = Bowser.getParser(window.navigator.userAgent);
    return {
      browserInfo: `${browser.getBrowserName()} ${browser.getBrowserVersion()}`,
      osInfo: `${browser.getOSName()} ${browser.getOSVersion()}`,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      appVersion: '1.0.0' // You can get this from your app config
    };
  }, []);

  // Memoized function to process file attachment
  const processFileAttachment = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64String = reader.result.split(',')[1];
          resolve({
            filename: file.name,
            contentType: file.type,
            data: base64String
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Validation
    if (!feedbackText.trim() || feedbackText.trim().length < 10) {
      dispatch(showNotification('Please enter at least 10 characters for feedback', 'warning'));
      return;
    }

    if (!category) {
      dispatch(showNotification('Please select a category', 'warning'));
      return;
    }

    if (category === 'Other' && !customCategory.trim()) {
      dispatch(showNotification('Please specify custom category', 'warning'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Get system information
      const systemInfo = getSystemInfo();
      
      // Fetch user location
      const locationData = await fetchUserLocation();

      // Prepare base feedback data
      const feedbackData = {
        message: feedbackText.trim(),
        bugType: category,
        customBugType: category === 'Other' ? customCategory.trim() : undefined,
        severity: 'Medium', // Default severity, can be made configurable
        browserInfo: systemInfo.browserInfo,
        osInfo: systemInfo.osInfo,
        screenResolution: systemInfo.screenResolution,
        appVersion: systemInfo.appVersion,
        location: locationData,
        stepsToReproduce: `Category: ${category}${category === 'Other' ? ` (${customCategory})` : ''}`,
        ...(userId ? { userId } : {}),
      };

      // Process file attachment if present
      if (file) {
        try {
          const attachment = await processFileAttachment(file);
          feedbackData.attachmentUrls = [attachment.data]; // Store base64 data
        } catch (error) {
          console.error('Failed to process file:', error);
          dispatch(showNotification('Failed to process file attachment. Please try again.', 'error'));
          return;
        }
      }

      console.log('Submitting feedback data:', feedbackData);

      // Submit feedback using thunk
      const result =await dispatch(submitBugFeedbackThunk(feedbackData));
      if (result.success) {
        // Reset form on success
        setFeedbackText('');
        setCategory('');
        setCustomCategory('');
        setFile(null);
        setPreviewUrl(null);
        
        // Close dialog on success
        dispatch(feedbackClick(false));
        
        // Optional: Show success message or redirect
        console.log('Feedback submitted successfully:', result.data);
      } else {
        console.error('Failed to submit feedback:', result.error);
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
      dispatch(showNotification('An unexpected error occurred. Please try again.', 'error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    feedbackText,
    category,
    customCategory,
    file,
    userId,
    dispatch,
    getSystemInfo,
    processFileAttachment
  ]);

  // Handle file change
  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file size (e.g., max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > maxSize) {
        dispatch(showNotification('File size must be less than 5MB', 'warning'));
        return;
      }
      
      // Validate file type — images only
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) {
        dispatch(showNotification('Please select an image file (JPEG, PNG, GIF, or WebP)', 'warning'));
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreviewUrl(null);
      }
    }
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((e) => {
    setCategory(e.target.value);
    if (e.target.value !== 'Other') {
      setCustomCategory(''); // Clear custom category when not "Other"
    }
  }, []);

  // Handle file removal
  const handleFileRemove = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    // Reset the file input value to allow re-uploading the same file
    const fileInput = document.getElementById('raised-button-file');
    if (fileInput) {
      fileInput.value = '';
    }
  }, []);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="body"
      TransitionComponent={SlideUp}
      transitionDuration={{ enter: 300, exit: 200 }}
      sx={{ zIndex: 10000 }}
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode
            ? "var(--tw-color-dark-primary, #1f2937)"
            : "var(--tw-color-light-primary, #ffffff)",
          color: isDarkMode
            ? "var(--tw-color-dark-text, #f9fafb)"
            : "var(--tw-color-light-text, #111827)",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        },
      }}
      className={`${isDarkMode ? "dark" : ""}`}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
        className="dark:bg-dark-primary dark:text-dark-text bg-light-primary text-light-text"
      >
        <Typography
          variant="h6"
          component="div"
          className="dark:text-dark-text text-light-text"
        >
          Submit Feedback
        </Typography>
        <IconButton
          edge="end"
          className="dark:text-dark-text text-light-text"
          onClick={onClose}
          aria-label="close"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent
          sx={{ paddingTop: 2 }}
          className="dark:bg-dark-primary dark:text-dark-text bg-light-primary text-light-text"
        >
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel
              id="category-label"
              className="dark:text-dark-text text-light-text"
              sx={{
                "&.Mui-focused": {
                  color: isDarkMode ? "#93c5fd" : "#2563eb",
                },
              }}
            >
              Category
            </InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={category}
              label="Category"
              onChange={handleCategoryChange}
              required
              disabled={isSubmitting}
              className="dark:bg-dark-secondary dark:text-dark-text bg-light-secondary text-light-text"
              MenuProps={{
                sx: { zIndex: 10001 },
                PaperProps: {
                  sx: {
                    backgroundColor: isDarkMode ? "var(--tw-color-dark-primary, #1f2937)" : "#fff",
                    color: isDarkMode ? "var(--tw-color-dark-text, #f9fafb)" : "inherit",
                  },
                },
              }}
              sx={{
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDarkMode
                    ? "rgba(249, 250, 251, 0.2)"
                    : "rgba(17, 24, 39, 0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDarkMode
                    ? "rgba(249, 250, 251, 0.3)"
                    : "rgba(17, 24, 39, 0.3)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDarkMode ? "#93c5fd" : "#2563eb",
                },
              }}
            >
              <MenuItem value="">Select Category</MenuItem>
              <MenuItem value="UI Issue">UI Issue</MenuItem>
              <MenuItem value="Crash">Crash</MenuItem>
              <MenuItem value="Performance">Performance</MenuItem>
              <MenuItem value="Suggestion">Suggestion</MenuItem>
              <MenuItem value="Security">Security</MenuItem>
              <MenuItem value="Functionality">Functionality</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>

          {category === "Other" && (
            <TextField
              fullWidth
              label="Custom Category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              required
              disabled={isSubmitting}
              margin="normal"
              variant="outlined"
              className="dark:bg-dark-secondary dark:text-dark-text bg-light-secondary text-light-text"
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: isDarkMode
                      ? "rgba(249, 250, 251, 0.2)"
                      : "rgba(17, 24, 39, 0.2)",
                  },
                  "&:hover fieldset": {
                    borderColor: isDarkMode
                      ? "rgba(249, 250, 251, 0.3)"
                      : "rgba(17, 24, 39, 0.3)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: isDarkMode ? "#93c5fd" : "#2563eb",
                  },
                },
                "& .MuiInputLabel-root": {
                  color: isDarkMode
                    ? "rgba(249, 250, 251, 0.7)"
                    : "rgba(17, 24, 39, 0.7)",
                  "&.Mui-focused": {
                    color: isDarkMode ? "#93c5fd" : "#2563eb",
                  },
                },
                "& .MuiInputBase-input": {
                  color: isDarkMode
                    ? "var(--tw-color-dark-text, #f9fafb)"
                    : "var(--tw-color-light-text, #111827)",
                },
              }}
              InputLabelProps={{
                className: "dark:text-dark-text text-light-text",
              }}
            />
          )}

          <TextField
            fullWidth
            label="Describe the bug or suggestion"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            required
            disabled={isSubmitting}
            multiline
            rows={4}
            margin="normal"
            variant="outlined"
            className="dark:bg-dark-secondary dark:text-dark-text bg-light-secondary text-light-text"
            sx={{
              mb: 3,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: isDarkMode
                    ? "rgba(249, 250, 251, 0.2)"
                    : "rgba(17, 24, 39, 0.2)",
                },
                "&:hover fieldset": {
                  borderColor: isDarkMode
                    ? "rgba(249, 250, 251, 0.3)"
                    : "rgba(17, 24, 39, 0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: isDarkMode ? "#93c5fd" : "#2563eb",
                },
              },
              "& .MuiInputLabel-root": {
                color: isDarkMode
                  ? "rgba(249, 250, 251, 0.7)"
                  : "rgba(17, 24, 39, 0.7)",
                "&.Mui-focused": {
                  color: isDarkMode ? "#93c5fd" : "#2563eb",
                },
              },
              "& .MuiInputBase-input": {
                color: isDarkMode
                  ? "var(--tw-color-dark-text, #f9fafb)"
                  : "var(--tw-color-light-text, #111827)",
              },
            }}
            InputLabelProps={{
              className: "dark:text-dark-text text-light-text",
            }}
          />

          <Box
            className={`border border-dashed rounded p-4 text-center ${
              isDarkMode
                ? "dark:border-dark-text/30 dark:bg-dark-secondary/30"
                : "border-light-text/20 bg-light-secondary/10"
            }`}
          >
            <input
              style={{ display: "none" }}
              id="raised-button-file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />

            <label htmlFor="raised-button-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                disabled={isSubmitting}
                className={`
                  ${
                    isDarkMode
                      ? "dark:border-dark-text/30 dark:text-dark-text"
                      : "border-light-text/20 text-light-text"
                  }
                `}
                sx={{
                  "&:hover": {
                    backgroundColor: isDarkMode
                      ? "rgba(249, 250, 251, 0.05)"
                      : "rgba(17, 24, 39, 0.05)",
                  },
                }}
              >
                Upload File
              </Button>
            </label>

            {file && (
              <Box
                sx={{
                  marginTop: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ marginBottom: 1 }}
                  className="dark:text-dark-text text-light-text"
                >
                  {file.name}
                </Typography>

                {previewUrl && (
                  <Box
                    sx={{
                      marginTop: 1,
                      position: "relative",
                      "&:hover .remove-btn": {
                        opacity: 1,
                      },
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{
                        maxWidth: "200px",
                        maxHeight: "200px",
                        borderRadius: "8px",
                        border: isDarkMode
                          ? "1px solid rgba(255, 255, 255, 0.2)"
                          : "1px solid rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <IconButton
                      onClick={handleFileRemove}
                      size="small"
                      className="remove-btn"
                      disabled={isSubmitting}
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        backgroundColor: isDarkMode
                          ? "rgba(31, 41, 55, 0.8)"
                          : "rgba(255, 255, 255, 0.8)",
                        color: isDarkMode ? "#f9fafb" : "#111827",
                        opacity: 0,
                        transition: "opacity 0.2s ease",
                        "&:hover": {
                          backgroundColor: isDarkMode
                            ? "rgba(31, 41, 55, 0.9)"
                            : "rgba(255, 255, 255, 0.9)",
                        },
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{ padding: 2 }}
          className="dark:bg-dark-primary dark:text-dark-text bg-light-primary text-light-text"
        >
          <Button
            onClick={onClose}
            disabled={isSubmitting}
            className="dark:text-dark-text/70 text-light-text/70 hover:dark:bg-dark-secondary hover:bg-light-secondary/20"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !feedbackText.trim() || !category}
            className="dark:bg-dark-accent bg-light-accent dark:text-dark-text text-white"
            sx={{
              "&:hover": {
                backgroundColor: isDarkMode
                  ? "var(--tw-color-dark-accent, #60a5fa)"
                  : "var(--tw-color-light-accent, #3b82f6)",
                opacity: 0.9,
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Feedback;