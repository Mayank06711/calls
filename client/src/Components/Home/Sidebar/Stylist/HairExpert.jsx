import React from "react";
import { motion } from "framer-motion";
import {
  ContentCutOutlined,
  ArrowBack,
  AutoAwesome,
  PersonSearchOutlined,
  CalendarMonthOutlined,
  FaceOutlined,
} from "@mui/icons-material";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";

const HAIR_SUGGESTIONS = [
  {
    id: 1,
    title: "Modern Textured Crop",
    description: "Low maintenance, works with most face shapes. Perfect for a clean, fresh look.",
    tags: ["Trending", "Low Effort"],
  },
  {
    id: 2,
    title: "Layered Waves",
    description: "Adds volume and movement. Great for medium to long hair with natural texture.",
    tags: ["Versatile", "Natural"],
  },
  {
    id: 3,
    title: "Sleek Side Part",
    description: "Classic and polished. Ideal for formal settings and professional environments.",
    tags: ["Classic", "Formal"],
  },
];

function HairExpert() {
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
                  Hair Expert
                </h2>
                <ContentCutOutlined style={{ color: colors.fourth, fontSize: 16 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                AI-powered hairstyle recommendations
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

        {/* AI Suggestions Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <AutoAwesome style={{ color: colors.fourth, fontSize: 18 }} />
          <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
            AI Hair Style Suggestions
          </h3>
        </motion.div>

        {/* Suggestion Cards */}
        <div className="space-y-3">
          {HAIR_SUGGESTIONS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.4 }}
              className="group relative overflow-hidden rounded-xl p-4
                dark:bg-dark-primary bg-light-secondary
                hover:shadow-md transition-all duration-300"
              style={{ border: `1px solid ${toRgba(colors.fourth, 0.12)}` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.15)}, ${toRgba(colors.fourth, 0.06)})`,
                  }}
                >
                  <FaceOutlined style={{ color: colors.fourth, fontSize: 24 }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold dark:text-dark-text text-light-text">
                    {item.title}
                  </h4>
                  <p className="text-xs dark:text-dark-text/50 text-light-text/50 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: toRgba(colors.fourth, 0.1),
                          color: colors.fourth,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Want More Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-4 pt-2"
        >
          <div className="text-center">
            <p className="text-xs dark:text-dark-text/50 text-light-text/50">
              Want more personalized advice? Connect with a hair specialist.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              fullWidth
              variant="contained"
              startIcon={<PersonSearchOutlined />}
              onClick={() => navigate("/chats")}
              sx={{
                backgroundColor: colors.fourth,
                "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) },
                borderRadius: "0.75rem",
                textTransform: "none",
                fontWeight: 600,
                py: 1.2,
              }}
            >
              Connect Instantly
            </Button>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CalendarMonthOutlined />}
              sx={{
                borderColor: colors.fourth,
                color: colors.fourth,
                "&:hover": { borderColor: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.08) },
                borderRadius: "0.75rem",
                textTransform: "none",
                fontWeight: 600,
                py: 1.2,
              }}
            >
              Book Appointment
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default HairExpert;
