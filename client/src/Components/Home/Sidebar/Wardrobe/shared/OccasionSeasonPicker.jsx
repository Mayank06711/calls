import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { KeyboardArrowDown } from "@mui/icons-material";

const SEASONS = [
  { value: "Summer", label: "Summer" },
  { value: "Winter", label: "Winter" },
  { value: "Monsoon", label: "Monsoon" },
  { value: "auto", label: "Auto (detect)" },
];

const OCCASIONS = [
  "Casual",
  "Office: Daily Wear",
  "Office: Meeting",
  "Party: Night Out",
  "Party: Day Event",
  "Date Night",
  "Wedding",
  "Festive",
  "Travel",
  "Sports",
  "Lounge",
];

function CustomSelect({ value, onChange, options, placeholder, colors }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePos = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (open) updatePos();
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => updatePos();
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open, updatePos]);

  const selectedLabel = options.find((o) =>
    typeof o === "string" ? o === value : o.value === value
  );
  const displayLabel = selectedLabel
    ? typeof selectedLabel === "string"
      ? selectedLabel
      : selectedLabel.label
    : placeholder;

  // Determine if menu should open upward (not enough space below)
  const spaceBelow = typeof window !== "undefined" ? window.innerHeight - pos.top : 300;
  const openUpward = spaceBelow < 220 && pos.top > 220;

  const menuStyle = {
    position: "fixed",
    left: pos.left,
    width: pos.width,
    zIndex: 9999,
    ...(openUpward
      ? { bottom: typeof window !== "undefined" ? window.innerHeight - (pos.top - 8) : 0 }
      : { top: pos.top }),
  };

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text transition-all text-left"
        style={{
          borderColor: open ? colors.fourth : `${colors.fourth}40`,
          boxShadow: open ? `0 0 0 2px ${colors.fourth}30` : "none",
        }}
      >
        <span className={value ? "" : "dark:text-dark-text/40 text-light-text/40"}>
          {displayLabel}
        </span>
        <KeyboardArrowDown
          style={{
            fontSize: 18,
            color: colors.fourth,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="rounded-lg border shadow-xl dark:bg-dark-primary bg-light-secondary max-h-52 overflow-y-auto custom-scrollbar"
          style={{ ...menuStyle, borderColor: `${colors.fourth}30` }}
        >
          {options.map((opt, idx) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt : opt.label;
            const isSelected = optValue === value;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(optValue);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  backgroundColor: isSelected ? `${colors.fourth}20` : "transparent",
                  color: isSelected ? colors.fourth : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = `${colors.fourth}10`;
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span className={isSelected ? "font-medium" : "dark:text-dark-text/80 text-light-text/80"}>
                  {optLabel}
                </span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export { CustomSelect };

function OccasionSeasonPicker({ occasion, season, onOccasionChange, onSeasonChange, compact = false }) {
  const colors = useSubscriptionColors();

  if (compact) {
    return (
      <div className="flex gap-2 w-full">
        <div className="flex-1 min-w-0">
          <CustomSelect
            value={occasion}
            onChange={onOccasionChange}
            options={OCCASIONS}
            placeholder="Occasion"
            colors={colors}
          />
        </div>
        <div className="flex-1 min-w-0">
          <CustomSelect
            value={season}
            onChange={onSeasonChange}
            options={SEASONS}
            placeholder="Season"
            colors={colors}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-wrap gap-3">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
          Occasion
        </label>
        <CustomSelect
          value={occasion}
          onChange={onOccasionChange}
          options={OCCASIONS}
          placeholder="Select occasion"
          colors={colors}
        />
      </div>

      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
          Season
        </label>
        <CustomSelect
          value={season}
          onChange={onSeasonChange}
          options={SEASONS}
          placeholder="Select season"
          colors={colors}
        />
      </div>
    </div>
  );
}

export default OccasionSeasonPicker;
