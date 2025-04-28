import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import { Close, CloudUpload } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { feedbackClick } from "../../redux/actions";
import { fetchUserLocation } from "../../helper/locatonPicker";

const Feedback = () => {
  const [category, setCategory] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [file, setFile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isOpen = useSelector((state) => state.isOpenFeedback);
  const dispatch = useDispatch();
  const storedDarkMode = localStorage.getItem("isDarkMode");
  const [previewUrl, setPreviewUrl] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const browser = Bowser.getParser(window.navigator.userAgent);
    const browserInfo =
      browser.getBrowserName() + " " + browser.getBrowserVersion();
    const osInfo = browser.getOSName() + " " + browser.getOSVersion();
    const screenResolution = `${window.screen.width}x${window.screen.height}`;

    // Step 1: Fetch user's location info
    const locationData = await fetchUserLocation();

    // Create a JSON object instead of FormData
    const feedbackData = {
      category,
      customCategory: category === "Other" ? customCategory : "",
      feedbackText,
      browserInfo,
      osInfo,
      screenResolution,
      location: locationData, // add location info here
    };

    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(",")[1];

        feedbackData.attachment = {
          filename: file.name,
          contentType: file.type,
          data: base64String,
        };

        console.log("Feedback data in JSON format:", feedbackData);
        // await sendFeedbackData(feedbackData);
      };
      reader.readAsDataURL(file);
    } else {
      console.log("Feedback data in JSON format:", feedbackData);
      //   await sendFeedbackData(feedbackData);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="body"

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
      sx={{
        backdropFilter: "blur(8px)",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
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
            >
              Category
            </InputLabel>
            <Select
              labelId="category-label"
              id="category"
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
              required
              className="dark:bg-dark-secondary dark:text-dark-text bg-light-secondary text-light-text"
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
              }}
            >
              <MenuItem value="">Select Category</MenuItem>
              <MenuItem value="UI Issue">UI Issue</MenuItem>
              <MenuItem value="Crash">Crash</MenuItem>
              <MenuItem value="Performance">Performance</MenuItem>
              <MenuItem value="Suggestion">Suggestion</MenuItem>
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
                },
                "& .MuiInputLabel-root": {
                  color: isDarkMode
                    ? "rgba(249, 250, 251, 0.7)"
                    : "rgba(17, 24, 39, 0.7)",
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
              },
              "& .MuiInputLabel-root": {
                color: isDarkMode
                  ? "rgba(249, 250, 251, 0.7)"
                  : "rgba(17, 24, 39, 0.7)",
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
              accept="image/*"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] ?? null;
                setFile(selectedFile);

                if (selectedFile) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setPreviewUrl(reader.result);
                  };
                  reader.readAsDataURL(selectedFile);
                } else {
                  setPreviewUrl(null);
                }
              }}
            />

            <label htmlFor="raised-button-file">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
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
                Upload Image
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
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                      size="small"
                      className="remove-btn"
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
            className="dark:text-dark-text/70 text-light-text/70 hover:dark:bg-dark-secondary hover:bg-light-secondary/20"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
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
            Submit
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Feedback;
