import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckroomOutlined,
  ArrowBack,
  AutoAwesome,
  PersonSearchOutlined,
  CalendarMonthOutlined,
  ShoppingBagOutlined,
  SentimentDissatisfiedOutlined,
} from "@mui/icons-material";
import { Button, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";

const OCCASIONS = [
  { key: "casual", label: "Casual" },
  { key: "formal", label: "Formal" },
  { key: "party", label: "Party" },
  { key: "date-night", label: "Date Night" },
  { key: "office", label: "Office" },
  { key: "outdoor", label: "Outdoor" },
];

const STYLES = [
  { key: "trendy", label: "Trendy" },
  { key: "classic", label: "Classic" },
  { key: "minimal", label: "Minimal" },
  { key: "streetwear", label: "Streetwear" },
  { key: "bohemian", label: "Bohemian" },
  { key: "preppy", label: "Preppy" },
];

// Placeholder product suggestions (will come from API in Phase 2)
const PLACEHOLDER_SUGGESTIONS = [
  {
    id: 1,
    title: "Curated Look #1",
    description: "Based on your preferences",
    gradient: "from-blue-500/20 to-purple-500/20",
  },
  {
    id: 2,
    title: "Curated Look #2",
    description: "Trending this season",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    id: 3,
    title: "Curated Look #3",
    description: "Editor's pick",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
];

function ClothingExpert() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();

  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [step, setStep] = useState("input"); // input | results | expert
  const [isLoading, setIsLoading] = useState(false);

  const handleGetSuggestions = () => {
    if (!selectedOccasion || !selectedStyle) return;
    setIsLoading(true);
    // Simulate AI processing (Phase 2: actual API call)
    setTimeout(() => {
      setIsLoading(false);
      setStep("results");
    }, 1500);
  };

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
                  Clothing Expert
                </h2>
                <CheckroomOutlined style={{ color: colors.fourth, fontSize: 16 }} />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                Tell us your vibe — we'll style you up
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

        {/* ── Step 1: Input ── */}
        {step === "input" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Occasion Selection */}
            <div>
              <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">
                What's the occasion?
              </h3>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <Chip
                    key={o.key}
                    label={o.label}
                    onClick={() => setSelectedOccasion(o.key)}
                    variant={selectedOccasion === o.key ? "filled" : "outlined"}
                    sx={{
                      borderColor: toRgba(colors.fourth, 0.4),
                      color: selectedOccasion === o.key ? "#fff" : colors.fourth,
                      backgroundColor: selectedOccasion === o.key ? colors.fourth : "transparent",
                      "&:hover": {
                        backgroundColor: selectedOccasion === o.key
                          ? colors.fourth
                          : toRgba(colors.fourth, 0.1),
                      },
                      fontWeight: 500,
                      fontSize: "0.8rem",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Style Preference */}
            <div>
              <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3">
                Your style preference
              </h3>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.label}
                    onClick={() => setSelectedStyle(s.key)}
                    variant={selectedStyle === s.key ? "filled" : "outlined"}
                    sx={{
                      borderColor: toRgba(colors.fourth, 0.4),
                      color: selectedStyle === s.key ? "#fff" : colors.fourth,
                      backgroundColor: selectedStyle === s.key ? colors.fourth : "transparent",
                      "&:hover": {
                        backgroundColor: selectedStyle === s.key
                          ? colors.fourth
                          : toRgba(colors.fourth, 0.1),
                      },
                      fontWeight: 500,
                      fontSize: "0.8rem",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Get Suggestions Button */}
            <Button
              fullWidth
              variant="contained"
              disabled={!selectedOccasion || !selectedStyle || isLoading}
              onClick={handleGetSuggestions}
              startIcon={isLoading ? null : <AutoAwesome />}
              sx={{
                backgroundColor: colors.fourth,
                "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) },
                "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.4), color: "rgba(255,255,255,0.6)" },
                borderRadius: "0.75rem",
                textTransform: "none",
                fontWeight: 600,
                py: 1.2,
              }}
            >
              {isLoading ? "Finding perfect looks..." : "Get AI Suggestions"}
            </Button>
          </motion.div>
        )}

        {/* ── Step 2: Results ── */}
        {step === "results" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">
                AI-Curated Looks
              </h3>
              <Chip
                label={`${selectedOccasion} · ${selectedStyle}`}
                size="small"
                sx={{
                  backgroundColor: toRgba(colors.fourth, 0.12),
                  color: colors.fourth,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Product/Outfit Cards (placeholder) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLACEHOLDER_SUGGESTIONS.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className={`relative rounded-xl overflow-hidden bg-gradient-to-br ${item.gradient}
                    dark:bg-dark-primary bg-light-secondary
                    border cursor-pointer hover:shadow-lg transition-all duration-300`}
                  style={{ border: `1px solid ${toRgba(colors.fourth, 0.15)}` }}
                >
                  {/* Placeholder image area */}
                  <div className="aspect-[3/4] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <ShoppingBagOutlined style={{ color: toRgba(colors.fourth, 0.3), fontSize: 48 }} />
                      <p className="text-[10px] dark:text-dark-text/30 text-light-text/30">
                        Product image
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-semibold dark:text-dark-text text-light-text">
                      {item.title}
                    </h4>
                    <p className="text-[10px] dark:text-dark-text/50 text-light-text/50 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
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
                  Connect to Expert
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

              {/* Not happy with AI */}
              <div
                className="flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer
                  hover:bg-white/5 transition-colors"
                onClick={() => setStep("expert")}
              >
                <SentimentDissatisfiedOutlined style={{ color: toRgba(colors.fourth, 0.5), fontSize: 18 }} />
                <span className="text-xs dark:text-dark-text/50 text-light-text/50 hover:dark:text-dark-text/70 hover:text-light-text/70 transition-colors">
                  Not happy with AI? Get expert suggestion
                </span>
              </div>
            </div>

            {/* Try Again */}
            <button
              onClick={() => { setStep("input"); setSelectedOccasion(null); setSelectedStyle(null); }}
              className="text-xs underline dark:text-dark-text/40 text-light-text/40 hover:dark:text-dark-text/60 hover:text-light-text/60 transition-colors"
            >
              Try different preferences
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Expert Connection ── */}
        {step === "expert" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{
                  background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.2)}, ${toRgba(colors.fourth, 0.08)})`,
                }}
              >
                <PersonSearchOutlined style={{ color: colors.fourth, fontSize: 32 }} />
              </div>
              <h3 className="text-lg font-bold dark:text-dark-text text-light-text mb-1">
                Get Expert Help
              </h3>
              <p className="text-sm dark:text-dark-text/50 text-light-text/50 max-w-sm mx-auto">
                Connect with a certified clothing expert who'll provide personalized styling advice tailored just for you.
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
                  py: 1.5,
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
                  py: 1.5,
                }}
              >
                Book Appointment
              </Button>
            </div>

            <button
              onClick={() => setStep("results")}
              className="text-xs underline dark:text-dark-text/40 text-light-text/40 hover:dark:text-dark-text/60 hover:text-light-text/60 transition-colors"
            >
              Back to AI suggestions
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default ClothingExpert;
