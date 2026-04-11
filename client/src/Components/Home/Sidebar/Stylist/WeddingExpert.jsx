import React from "react";
import { motion } from "framer-motion";
import {
  CelebrationOutlined,
  ArrowBack,
  CalendarMonthOutlined,
  CheckCircleOutline,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import ExpertPanel from "./ExpertPanel";

const SERVICES = [
  "Bridal styling & outfit selection",
  "Groom & groomsmen coordination",
  "Guest & family styling",
  "Mehendi, sangeet & reception looks",
  "Destination wedding wardrobe planning",
  "Cultural & traditional outfit guidance",
];

function WeddingExpert() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Hero Header ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 50%, ${toRgba(colors.fourth, 0.05)} 100%)`,
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.07) }}
        />
        <div className="relative px-4 sm:px-5 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/stylist")}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                boxShadow: `0 3px 10px ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              <ArrowBack style={{ color: "#fff", fontSize: 20 }} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold dark:text-dark-text text-light-text tracking-tight leading-tight">
                  Wedding & Event
                </h2>
                <CelebrationOutlined style={{ color: colors.fourth, fontSize: 16 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                Expert styling for your special occasions
              </p>
            </div>
          </div>
        </div>
        <div
          className="h-[2px]"
          style={{ background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)` }}
        />
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pt-5 pb-6 space-y-6">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-4"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.2)}, ${toRgba(colors.fourth, 0.08)})`,
              boxShadow: `0 4px 16px ${toRgba(colors.fourth, 0.15)}`,
            }}
          >
            <CelebrationOutlined style={{ color: colors.fourth, fontSize: 40 }} />
          </div>
          <h3 className="text-lg font-bold dark:text-dark-text text-light-text mb-2">
            Make Every Moment Perfect
          </h3>
          <p className="text-sm dark:text-dark-text/50 text-light-text/50 max-w-md mx-auto leading-relaxed">
            From weddings to festive celebrations, our event styling experts will ensure you look and feel your absolute best.
          </p>
        </motion.div>

        {/* Services List */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-xl p-4 dark:bg-dark-primary bg-light-secondary"
          style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
        >
          <h4 className="text-xs font-bold uppercase tracking-widest dark:text-dark-text/40 text-light-text/40 mb-3">
            Our Services
          </h4>
          <div className="space-y-2.5">
            {SERVICES.map((service, idx) => (
              <motion.div
                key={service}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
                className="flex items-center gap-2.5"
              >
                <CheckCircleOutline style={{ color: colors.fourth, fontSize: 16 }} />
                <span className="text-xs dark:text-dark-text/70 text-light-text/70">
                  {service}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Expert Panel ── */}
        <ExpertPanel category="wedding" colors={colors} delay={0.5} />

        {/* Schedule Call CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="space-y-3"
        >
          <div
            className="text-center p-3 rounded-xl"
            style={{
              backgroundColor: toRgba(colors.fourth, 0.06),
              border: `1px solid ${toRgba(colors.fourth, 0.1)}`,
            }}
          >
            <p className="text-xs dark:text-dark-text/50 text-light-text/50">
              Wedding styling requires personalized consultation. Schedule a call with our event styling expert to discuss your needs.
            </p>
          </div>

          <Button
            fullWidth
            variant="contained"
            startIcon={<CalendarMonthOutlined />}
            sx={{
              backgroundColor: colors.fourth,
              "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) },
              borderRadius: "0.75rem",
              textTransform: "none",
              fontWeight: 600,
              py: 1.5,
              boxShadow: `0 4px 14px ${toRgba(colors.fourth, 0.3)}`,
            }}
          >
            Schedule a Call
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default WeddingExpert;
