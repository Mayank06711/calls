import { useState } from "react";
import PropTypes from "prop-types";
import { Close, VolunteerActivism } from "@mui/icons-material";
import { IconButton, CircularProgress } from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { makeRequest } from "../../../../utils/apiHandlers";
import { useDispatch } from "react-redux";
import { showNotification } from "../../../../redux/actions/notification.actions";

const PRESET_AMOUNTS = [50, 100, 200, 500];

const TipExpertModal = ({ expertId, expertName, onClose }) => {
  const [amount, setAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();

  const selectedAmount = amount || (customAmount ? parseInt(customAmount) : 0);

  const handlePresetClick = (preset) => {
    setAmount(preset);
    setCustomAmount("");
  };

  const handleCustomChange = (e) => {
    let val = e.target.value.replace(/[^0-9]/g, "");
    if (val && parseInt(val) > 5000) val = "5000";
    setCustomAmount(val);
    setAmount(null);
  };

  const handleSubmit = async () => {
    if (!selectedAmount || selectedAmount < 1) {
      dispatch(showNotification("Please select or enter an amount", "error"));
      return;
    }
    if (selectedAmount > 5000) {
      dispatch(showNotification("Maximum tip amount is ₹5,000", "error"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await makeRequest("POST", "/api/v1/tips", {
        expertId,
        amount: selectedAmount,
        currency: "INR",
        message: message.trim() || undefined,
      });
      if (res?.error) {
        dispatch(showNotification(res.error.message || "Failed to create tip", "error"));
      } else {
        dispatch(showNotification(`Tip of \u20B9${selectedAmount} recorded. Payment pending.`, "success"));
        onClose();
      }
    } catch (err) {
      dispatch(showNotification(err?.message || "Failed to create tip", "error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-text/10 dark:border-dark-text/10">
          <div className="flex items-center gap-2">
            <VolunteerActivism sx={{ fontSize: 22, color: colors.third }} />
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Support {expertName || "Expert"}
            </h3>
          </div>
          <IconButton onClick={onClose} size="small">
            <Close className="text-light-text/60 dark:text-dark-text/60" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Preset amounts */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePresetClick(preset)}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  amount === preset
                    ? "text-white shadow-md scale-105"
                    : "text-light-text dark:text-dark-text bg-light-text/5 dark:bg-dark-text/5 hover:bg-light-text/10 dark:hover:bg-dark-text/10"
                }`}
                style={amount === preset ? { background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` } : {}}
              >
                {"\u20B9"}{preset}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text/40 dark:text-dark-text/40 text-sm">
              {"\u20B9"}
            </span>
            <input
              type="text"
              value={customAmount}
              onChange={handleCustomChange}
              placeholder="Custom amount (max ₹5,000)"
              className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-light-text/20 dark:border-dark-text/20
                       bg-transparent text-light-text dark:text-dark-text text-sm
                       focus:outline-none focus:ring-2"
              style={{ focusRingColor: colors.third }}
            />
          </div>

          {/* Message */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional, max 500 chars)"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-light-text/20 dark:border-dark-text/20
                     bg-transparent text-light-text dark:text-dark-text text-sm resize-none
                     focus:outline-none focus:ring-2"
            style={{ focusRingColor: colors.third }}
          />
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
            disabled={isSubmitting || !selectedAmount || selectedAmount < 1 || selectedAmount > 5000}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})` }}
          >
            {isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            Tip {"\u20B9"}{selectedAmount || 0}
          </button>
        </div>
      </div>
    </div>
  );
};

TipExpertModal.propTypes = {
  expertId: PropTypes.string.isRequired,
  expertName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default TipExpertModal;
