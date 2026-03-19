import React from "react";
import { motion } from "framer-motion";
import {
  FaceRetouchingNaturalOutlined,
  ArrowBack,
  AutoAwesome,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import ExpertPanel from "./ExpertPanel";

const MAKEUP_TYPES = [
  {
    key: "no-makeup",
    title: "No-Makeup Look",
    description: "Enhance your natural beauty with subtle, skin-like products. Perfect for everyday wear.",
    icon: "\uD83C\uDF3F",
  },
  {
    key: "everyday",
    title: "Everyday Glam",
    description: "Polished and put-together without being overdone. Great for work and casual outings.",
    icon: "\u2728",
  },
  {
    key: "full-glam",
    title: "Full Glam",
    description: "Bold, dramatic, and camera-ready. Ideal for events, parties, and special nights out.",
    icon: "\uD83D\uDC84",
  },
  {
    key: "bridal",
    title: "Bridal & Event",
    description: "Long-lasting, photo-ready makeup designed for your most important day.",
    icon: "\uD83D\uDC70",
  },
];

function MakeupExpert() {
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
                  Makeup Expert
                </h2>
                <FaceRetouchingNaturalOutlined style={{ color: colors.fourth, fontSize: 16 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                Discover what makeup style suits you best
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pt-5 pb-6 space-y-5">

        {/* ── Always-visible Expert Panel ── */}
        <ExpertPanel category="makeup" colors={colors} />

        {/* ── Divider ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px dark:bg-dark-text/10 bg-light-text/10" />
          <span className="text-[10px] font-bold uppercase tracking-widest dark:text-dark-text/30 text-light-text/30">
            or explore AI suggestions
          </span>
          <div className="flex-1 h-px dark:bg-dark-text/10 bg-light-text/10" />
        </div>

        {/* AI Analysis Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <AutoAwesome style={{ color: colors.fourth, fontSize: 18 }} />
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
            Which Look Suits You?
          </h3>
        </motion.div>

        {/* Makeup Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MAKEUP_TYPES.map((type, idx) => (
            <motion.div
              key={type.key}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.12, duration: 0.4 }}
              className="group relative overflow-hidden rounded-xl p-4
                dark:bg-dark-primary bg-light-secondary
                hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              style={{ border: `1px solid ${toRgba(colors.fourth, 0.12)}` }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-30 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(90deg, ${colors.fourth}, transparent)` }}
              />
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{type.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold dark:text-dark-text text-light-text">
                    {type.title}
                  </h4>
                  <p className="text-xs dark:text-dark-text/50 text-light-text/50 mt-1 leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{
              backgroundColor: toRgba(colors.fourth, 0.06),
              border: `1px solid ${toRgba(colors.fourth, 0.1)}`,
            }}
          >
            <AutoAwesome style={{ color: colors.fourth, fontSize: 16 }} />
            <p className="text-xs dark:text-dark-text/60 text-light-text/60">
              Based on current trends and your profile, we recommend starting with <strong>Everyday Glam</strong> — it's versatile and flattering.
            </p>
          </div>
        </motion.div>

        {/* Post-AI expert nudge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="relative overflow-hidden rounded-xl p-4"
          style={{
            background: `linear-gradient(145deg, ${toRgba(colors.fourth, 0.06)}, transparent)`,
            border: `1px dashed ${toRgba(colors.fourth, 0.2)}`,
          }}
        >
          <p className="text-xs dark:text-dark-text/50 text-light-text/50 mb-3">
            Not satisfied with AI? A makeup expert can analyze your features and recommend the perfect look.
          </p>
          <ExpertPanel category="makeup" colors={colors} delay={0} />
        </motion.div>
      </div>
    </div>
  );
}

export default MakeupExpert;
