import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, CircularProgress, IconButton } from "@mui/material";
import { CloseOutlined, TimerOutlined } from "@mui/icons-material";
import { toRgba } from "../../../../utils/getSubscriptionColors";

const DURATION_OPTIONS = [
  { value: 15, label: "15 min", desc: "Quick consultation" },
  { value: 30, label: "30 min", desc: "Standard session" },
  { value: 60, label: "60 min", desc: "Deep dive" },
];

function InstantDurationPicker({ open, onSelect, onCancel, loading, colors }) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) onCancel();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-2xl p-5 dark:bg-dark-secondary bg-light-secondary shadow-2xl"
          style={{ border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TimerOutlined style={{ color: colors.fourth, fontSize: 22 }} />
              <h3 className="text-base font-bold dark:text-dark-text text-light-text">
                Select Session Duration
              </h3>
            </div>
            <IconButton
              size="small"
              onClick={onCancel}
              disabled={loading}
              sx={{ color: "inherit", opacity: 0.5 }}
            >
              <CloseOutlined fontSize="small" />
            </IconButton>
          </div>

          <p className="text-xs dark:text-dark-text/50 text-light-text/50 mb-4">
            Choose how long you'd like your instant expert session to be.
          </p>

          <div className="flex flex-col gap-2.5">
            {DURATION_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                fullWidth
                variant="outlined"
                disabled={loading}
                onClick={() => onSelect(opt.value)}
                sx={{
                  borderColor: toRgba(colors.fourth, 0.3),
                  color: colors.fourth,
                  "&:hover": {
                    borderColor: colors.fourth,
                    backgroundColor: toRgba(colors.fourth, 0.08),
                  },
                  "&.Mui-disabled": {
                    borderColor: toRgba(colors.fourth, 0.15),
                    color: toRgba(colors.fourth, 0.4),
                  },
                  borderRadius: "0.75rem",
                  textTransform: "none",
                  py: 1.2,
                  justifyContent: "flex-start",
                  px: 2,
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{opt.label}</span>
                    <span
                      className="text-[10px] opacity-60"
                      style={{ color: "inherit" }}
                    >
                      {opt.desc}
                    </span>
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t dark:border-dark-text/10 border-light-text/10">
              <CircularProgress
                size={16}
                sx={{ color: colors.fourth }}
              />
              <span className="text-xs dark:text-dark-text/60 text-light-text/60">
                Finding expert and creating session...
              </span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InstantDurationPicker;
