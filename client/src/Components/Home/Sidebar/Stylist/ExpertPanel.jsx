import React from "react";
import { motion } from "framer-motion";
import {
  PersonSearchOutlined,
  CalendarMonthOutlined,
  BoltOutlined,
} from "@mui/icons-material";
import { Button, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toRgba } from "../../../../utils/getSubscriptionColors";
import { useInstantExpert } from "../../../../hooks/useInstantExpert";

function ExpertPanel({ category, colors, delay = 0.2 }) {
  const { findExpert, loading, error } = useInstantExpert();
  const navigate = useNavigate();

  const handleInstantExpert = () => {
    if (!loading) {
      findExpert(category);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: `linear-gradient(145deg, ${toRgba(colors.fourth, 0.08)}, ${toRgba(colors.fourth, 0.03)})`,
        border: `1px solid ${toRgba(colors.fourth, 0.18)}`,
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)`,
        }}
      />
      <div className="flex items-center gap-2 mb-3">
        <PersonSearchOutlined style={{ color: colors.fourth, fontSize: 18 }} />
        <h4 className="text-xs font-bold uppercase tracking-wider dark:text-dark-text/70 text-light-text/70">
          Get Expert Help
        </h4>
      </div>
      <p className="text-xs dark:text-dark-text/50 text-light-text/50 mb-3 leading-relaxed">
        Connect directly with a certified expert for personalized advice.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Button
          fullWidth
          variant="contained"
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <BoltOutlined />
            )
          }
          onClick={handleInstantExpert}
          disabled={loading}
          sx={{
            backgroundColor: colors.fourth,
            "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) },
            "&.Mui-disabled": {
              backgroundColor: toRgba(colors.fourth, 0.6),
              color: "rgba(255,255,255,0.8)",
            },
            borderRadius: "0.75rem",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            py: 1,
          }}
        >
          {loading ? "Finding Expert..." : "Instant Expert"}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<CalendarMonthOutlined />}
          onClick={() => navigate(`/stylist/experts?category=${category}`)}
          sx={{
            borderColor: toRgba(colors.fourth, 0.5),
            color: colors.fourth,
            "&:hover": {
              borderColor: colors.fourth,
              backgroundColor: toRgba(colors.fourth, 0.08),
            },
            borderRadius: "0.75rem",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.8rem",
            py: 1,
          }}
        >
          Schedule Appointment
        </Button>
      </div>
      {error === "no_experts" && (
        <p className="text-xs text-amber-500 mt-2.5 leading-relaxed">
          No experts available right now. Try scheduling an appointment instead.
        </p>
      )}
    </motion.div>
  );
}

export default ExpertPanel;
