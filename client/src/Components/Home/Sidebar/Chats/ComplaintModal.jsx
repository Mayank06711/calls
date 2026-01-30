import { useState } from "react";
import PropTypes from "prop-types";
import { Close, Flag, Image } from "@mui/icons-material";
import { IconButton, CircularProgress, Switch } from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { uploadImage } from "../../../../socket/handleImageUpload";
import { makeRequest } from "../../../../utils/apiHandlers";
import { useDispatch } from "react-redux";
import { showNotification } from "../../../../redux/actions/notification.actions";

const CATEGORIES = [
  { value: "harassment", label: "Harassment" },
  { value: "fraud", label: "Fraud" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

const ComplaintModal = ({ expertId, expertName, chatId, messages, onClose }) => {
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [attachTranscript, setAttachTranscript] = useState(true);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();

  const serializeTranscript = () => {
    if (!messages || !Array.isArray(messages)) return [];
    return messages.map((msg) => ({
      sender: msg.senderId || "",
      content: msg.content || "",
      type: msg.type || "text",
      timestamp: msg.timestamp || new Date().toISOString(),
      mediaUrl: msg.type !== "text" ? msg.content : undefined,
    }));
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 5) {
      dispatch(showNotification("Maximum 5 files allowed", "error"));
      return;
    }
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setMediaFiles((prev) => [...prev, ...files]);
    setMediaPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeMedia = (idx) => {
    URL.revokeObjectURL(mediaPreviews[idx]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== idx));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!category) {
      dispatch(showNotification("Please select a category", "error"));
      return;
    }
    if (reason.replace(/\s/g, "").length < 10) {
      dispatch(showNotification("Reason must be at least 10 characters", "error"));
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload media files one at a time
      let mediaUrls = [];
      for (const file of mediaFiles) {
        const result = await uploadImage({ file, type: "chat" });
        if (result?.url) mediaUrls.push(result.url);
      }

      const payload = {
        expertId,
        chatId: chatId || undefined,
        reason: reason.trim(),
        category,
        transcript: attachTranscript ? serializeTranscript() : undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      };

      const res = await makeRequest("POST", "/api/v1/complaints", payload);
      if (res?.error) {
        dispatch(showNotification(res.error.message || "Failed to submit complaint", "error"));
      } else {
        dispatch(showNotification("Complaint submitted successfully", "success"));
        onClose();
      }
    } catch (err) {
      dispatch(showNotification(err?.message || "Failed to submit complaint", "error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-text/10 dark:border-dark-text/10">
          <div className="flex items-center gap-2">
            <Flag sx={{ fontSize: 22, color: "#ef4444" }} />
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Report {expertName || "Expert"}
            </h3>
          </div>
          <IconButton onClick={onClose} size="small">
            <Close className="text-light-text/60 dark:text-dark-text/60" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Category - using buttons instead of native select for dark mode visibility */}
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const selected = category === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selected
                        ? "text-white border-transparent"
                        : "text-light-text/60 dark:text-dark-text/60 border-light-text/20 dark:border-dark-text/20"
                    }`}
                    style={selected ? { backgroundColor: colors.third } : {}}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-1.5">
              Description
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue in detail (min 10 characters)..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-light-text/20 dark:border-dark-text/20
                       bg-transparent text-light-text dark:text-dark-text text-sm resize-none
                       focus:outline-none focus:ring-2"
              style={{ focusRingColor: colors.third }}
            />
            <div className="text-right text-xs text-light-text/40 dark:text-dark-text/40 mt-1">
              {reason.replace(/\s/g, "").length} / 10 min
            </div>
          </div>

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediaPreviews.map((src, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeMedia(idx)}
                    className="absolute top-0 right-0 p-0.5 bg-black/60 rounded-bl-lg"
                  >
                    <Close sx={{ fontSize: 14, color: "white" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media upload */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.third }}>
            <Image sx={{ fontSize: 20 }} />
            <span>Attach screenshots (optional, max 5)</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleMediaSelect}
            />
          </label>

          {/* Transcript toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-light-text/70 dark:text-dark-text/70">
              Attach chat transcript ({messages?.length || 0} messages)
            </span>
            <Switch
              checked={attachTranscript}
              onChange={(e) => setAttachTranscript(e.target.checked)}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: colors.third },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: colors.third },
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-light-text/10 dark:border-dark-text/10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-light-text/60 dark:text-dark-text/60
                     hover:bg-light-text/5 dark:hover:bg-dark-text/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !category || reason.replace(/\s/g, "").length < 10}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-red-500 hover:bg-red-600"
          >
            {isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Flag sx={{ fontSize: 16 }} />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};

ComplaintModal.propTypes = {
  expertId: PropTypes.string.isRequired,
  expertName: PropTypes.string,
  chatId: PropTypes.string,
  messages: PropTypes.array,
  onClose: PropTypes.func.isRequired,
};

export default ComplaintModal;
