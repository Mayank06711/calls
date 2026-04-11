import React from "react";
import { motion } from "framer-motion";
import {
  AutoFixHighOutlined,
  ArrowBack,
  CheckroomOutlined,
  ContentCutOutlined,
  FaceRetouchingNaturalOutlined,
  DiamondOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import ExpertPanel from "./ExpertPanel";

const MAKEOVER_INCLUDES = [
  { icon: <CheckroomOutlined />, label: "Clothing & Style", description: "Complete wardrobe overhaul" },
  { icon: <ContentCutOutlined />, label: "Hair Styling", description: "Cut, color & care guidance" },
  { icon: <FaceRetouchingNaturalOutlined />, label: "Makeup & Skincare", description: "Beauty routine redesign" },
  { icon: <DiamondOutlined />, label: "Accessories", description: "Jewelry, bags & finishing touches" },
];

function CompleteMakeover() {
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
                  Complete Makeover
                </h2>
                <AutoFixHighOutlined style={{ color: colors.fourth, fontSize: 16 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                Full transformation with a personal stylist
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

        {/* Hero Section */}
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
            <AutoFixHighOutlined style={{ color: colors.fourth, fontSize: 40 }} />
          </div>
          <h3 className="text-lg font-bold dark:text-dark-text text-light-text mb-2">
            Your Style, Reimagined
          </h3>
          <p className="text-sm dark:text-dark-text/50 text-light-text/50 max-w-md mx-auto leading-relaxed">
            Get a head-to-toe transformation. A dedicated stylist will work with you on clothing, hair, makeup, and accessories — all in one session.
          </p>
        </motion.div>

        {/* What's Included */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <h4 className="text-xs font-bold uppercase tracking-widest dark:text-dark-text/40 text-light-text/40 mb-3">
            What's Included
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {MAKEOVER_INCLUDES.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="flex items-start gap-2.5 p-3 rounded-xl
                  dark:bg-dark-primary bg-light-secondary"
                style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
                >
                  {React.cloneElement(item.icon, { style: { color: colors.fourth, fontSize: 16 } })}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-semibold dark:text-dark-text text-light-text">
                    {item.label}
                  </h5>
                  <p className="text-[10px] dark:text-dark-text/45 text-light-text/45 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA — Expert Panel */}
        <ExpertPanel category="makeover" colors={colors} delay={0.6} />
      </div>
    </div>
  );
}

export default CompleteMakeover;
