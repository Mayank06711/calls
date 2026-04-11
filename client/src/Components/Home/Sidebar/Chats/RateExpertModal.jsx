import { useState } from "react";
import PropTypes from "prop-types";
import { Close, Star, StarBorder } from "@mui/icons-material";
import { IconButton, CircularProgress } from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { makeRequest } from "../../../../utils/apiHandlers";
import { useSelector, useDispatch } from "react-redux";
import { showNotification } from "../../../../redux/actions/notification.actions";

const ASPECTS = ["Knowledge", "Communication", "Helpfulness", "Promptness", "Overall"];

const RateExpertModal = ({ expertId, expertName, onClose }) => {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [selectedAspects, setSelectedAspects] = useState([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.auth?.userId);

  const toggleAspect = (aspect) => {
    setSelectedAspects((prev) =>
      prev.includes(aspect) ? prev.filter((a) => a !== aspect) : [...prev, aspect]
    );
  };

  const handleSubmit = async () => {
    if (stars === 0) {
      dispatch(showNotification("Please select a rating", "error"));
      return;
    }
    if (message.replace(/\s/g, "").length < 10) {
      dispatch(showNotification("Message must be at least 10 characters", "error"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await makeRequest("POST", "/api/v1/feedback/expert", {
        userId,
        expertId,
        stars,
        aspects: selectedAspects,
        message: message.trim(),
      });
      if (res?.error) {
        dispatch(showNotification(res.error.message || "Failed to submit rating", "error"));
      } else {
        dispatch(showNotification("Rating submitted successfully", "success"));
        onClose(true);
      }
    } catch (err) {
      dispatch(showNotification(err?.message || "Failed to submit rating", "error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayStars = hoverStars || stars;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-text/10 dark:border-dark-text/10">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Rate {expertName || "Expert"}
          </h3>
          <IconButton onClick={onClose} size="small">
            <Close className="text-light-text/60 dark:text-dark-text/60" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Stars */}
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStars(n)}
                onMouseEnter={() => setHoverStars(n)}
                onMouseLeave={() => setHoverStars(0)}
                className="transition-transform hover:scale-110"
              >
                {n <= displayStars ? (
                  <Star sx={{ fontSize: 36, color: "#f59e0b" }} />
                ) : (
                  <StarBorder sx={{ fontSize: 36, color: "#9ca3af" }} />
                )}
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-light-text/50 dark:text-dark-text/50">
            {stars === 0 ? "Tap a star" : `${stars} / 5`}
          </div>

          {/* Aspects */}
          <div>
            <label className="block text-sm font-medium text-light-text/70 dark:text-dark-text/70 mb-2">
              What stood out?
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECTS.map((aspect) => {
                const selected = selectedAspects.includes(aspect);
                return (
                  <button
                    key={aspect}
                    onClick={() => toggleAspect(aspect)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selected
                        ? "text-white"
                        : "text-light-text/60 dark:text-dark-text/60 bg-light-text/5 dark:bg-dark-text/5"
                    }`}
                    style={selected ? { background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` } : {}}
                  >
                    {aspect}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your experience (min 10 characters)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-light-text/20 dark:border-dark-text/20
                       bg-transparent text-light-text dark:text-dark-text text-sm resize-none
                       focus:outline-none focus:ring-2"
              style={{ focusRingColor: colors.third }}
            />
            <div className="text-right text-xs text-light-text/40 dark:text-dark-text/40 mt-1">
              {message.replace(/\s/g, "").length} / 10 min
            </div>
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
            disabled={isSubmitting || stars === 0 || message.replace(/\s/g, "").length < 10}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` }}
          >
            {isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Star sx={{ fontSize: 16 }} />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

RateExpertModal.propTypes = {
  expertId: PropTypes.string.isRequired,
  expertName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default RateExpertModal;
