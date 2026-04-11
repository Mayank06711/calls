import React, { useState, useRef } from "react";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";

/**
 * Game-like option selector with card grid, pulse ring, and spring bounce.
 *
 * Props:
 *  - fieldKey, options, value, onChange — core behavior
 *  - label, question, required — labeling
 *  - compact — smaller chips for edit mode
 *  - stagger — stagger entrance animation
 *  - hideLabel — hide the label row
 *  - cardMode — use large card grid instead of inline chips (wizard)
 */
function ChipField({ fieldKey, label, question, options = [], value, onChange, required, compact, stagger, hideLabel, cardMode }) {
  const colors = useSubscriptionColors();
  const [justSelected, setJustSelected] = useState(null);
  const [pulseOrigin, setPulseOrigin] = useState(null);
  const [hoveredOpt, setHoveredOpt] = useState(null);
  const containerRef = useRef(null);

  const handleSelect = (optValue, e) => {
    // Pulse ring from click position
    if (e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPulseOrigin({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setTimeout(() => setPulseOrigin(null), 600);
    }

    setJustSelected(optValue);
    onChange(fieldKey, optValue);
    setTimeout(() => setJustSelected(null), 500);
  };

  const selectedOpt = options.find((opt) => (opt.value || opt) === value);
  const selectedDesc = selectedOpt?.description;

  // Compact mode for EditMode
  if (compact) {
    return (
      <div>
        {!hideLabel && (label || question) && (
          <label className="block text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
            {question || label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const optValue = opt.value || opt;
            const isSelected = value === optValue;
            return (
              <button
                key={optValue}
                onClick={() => handleSelect(optValue)}
                className={`px-2.5 py-1 text-[11px] rounded-lg font-medium border transition-all duration-200
                  ${isSelected ? "text-white" : "dark:text-dark-text/70 text-light-text/70 dark:bg-dark-primary bg-light-secondary hover:opacity-80"}`}
                style={{
                  backgroundColor: isSelected ? colors.fourth : undefined,
                  borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.3),
                }}
              >
                {optValue}
              </button>
            );
          })}
        </div>
        {value && selectedDesc && (
          <p className="mt-1.5 text-[10px] leading-snug dark:text-dark-text/50 text-light-text/50 italic">
            {selectedDesc}
          </p>
        )}
      </div>
    );
  }

  // Full card mode for Wizard
  return (
    <div ref={containerRef} className="relative">
      {!hideLabel && (label || question) && (
        <label className="block text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
          {question || label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Card grid */}
      <div className={`grid ${options.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"} gap-2`}>
        {options.map((opt, i) => {
          const optValue = opt.value || opt;
          const isSelected = value === optValue;
          const isJustSelected = justSelected === optValue;

          return (
            <button
              key={optValue}
              onClick={(e) => handleSelect(optValue, e)}
              onMouseEnter={() => opt.description && setHoveredOpt(optValue)}
              onMouseLeave={() => setHoveredOpt(null)}
              className={`relative overflow-hidden rounded-xl border-2 px-2.5 py-2.5 text-[13px] font-semibold transition-all text-center
                ${isSelected
                  ? "text-white"
                  : "dark:text-dark-text/80 text-light-text/80 dark:bg-dark-primary/50 bg-light-secondary hover:border-opacity-50"
                }`}
              style={{
                backgroundColor: isSelected ? colors.fourth : undefined,
                borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.15),
                boxShadow: isSelected
                  ? `0 6px 20px ${toRgba(colors.fourth, 0.35)}`
                  : `0 1px 4px ${toRgba(colors.fourth, 0.05)}`,
                transform: isJustSelected
                  ? "scale(1.06)"
                  : isSelected
                    ? "scale(1.02)"
                    : "scale(1)",
                transitionDuration: isJustSelected ? "400ms" : "200ms",
                transitionTimingFunction: isJustSelected
                  ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
                  : "ease-out",
                ...(stagger ? {
                  animation: "cardEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
                  animationDelay: `${i * 60}ms`,
                } : {}),
              }}
            >
              {optValue}
              {/* Checkmark badge */}
              {isSelected && (
                <span
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pulse ring overlay */}
      {pulseOrigin && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            left: pulseOrigin.x - 20,
            top: pulseOrigin.y - 20,
            width: 40,
            height: 40,
            border: `2px solid ${colors.fourth}`,
            animation: "pulseRing 0.6s ease-out forwards",
          }}
        />
      )}

      {/* Description — fixed height container to prevent layout shift */}
      <div className="mt-2 h-6 flex items-start justify-center">
        {(() => {
          const hoverDesc = hoveredOpt
            ? options.find((o) => (o.value || o) === hoveredOpt)?.description
            : null;
          const desc = hoverDesc || selectedDesc;
          const showLabel = hoveredOpt || value;
          if (!showLabel || !desc) return null;
          return (
            <p
              key={hoveredOpt || value}
              className="text-xs leading-relaxed dark:text-dark-text/50 text-light-text/50 italic text-center"
              style={{ animation: "descFadeIn 0.25s ease-out both" }}
            >
              <span className="font-semibold not-italic" style={{ color: colors.fourth }}>
                {hoveredOpt || value}
              </span>
              {" — "}{desc}
            </p>
          );
        })()}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(12px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(6); opacity: 0; }
        }
        @keyframes descFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default ChipField;
