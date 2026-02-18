import React, { useState, useEffect, useCallback } from "react";
import { ArrowBack, ArrowForward, Check } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import ChipField from "../shared/ChipField";

/* ── Reaction emojis pool (rotated per pick) ── */
const EMOJIS = ["✨", "🔥", "💪", "🎯", "👌", "🙌", "💫", "🤙", "👏", "⚡"];
const pickEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

function WizardMode({
  sections,
  allFields,
  formData,
  onChipSelect,
  getOptionsForField,
  onSave,
  saving,
  requiredFields,
}) {
  const colors = useSubscriptionColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState(0);
  const [chipKey, setChipKey] = useState(0);

  // Game state
  const [reaction, setReaction] = useState(null);        // { text, emoji }
  const [celebration, setCelebration] = useState(null);   // { title, subtitle }

  const totalSteps = allFields.length;
  const field = allFields[currentStep];
  const isRequired = field?.required;
  const hasValue = !!formData[field?.key];
  const isLastStep = currentStep === totalSteps - 1;
  const allRequiredFilled = requiredFields.every((f) => formData[f.key]);

  const currentSection = sections.find((s) =>
    s.fields.some((f) => f.key === field?.key)
  );
  const sectionFieldIndex = currentSection?.fields.findIndex((f) => f.key === field?.key) ?? 0;
  const isLastInSection = sectionFieldIndex === (currentSection?.fields.length ?? 1) - 1;

  // Progress
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Filled fields for DNA strip
  const filledFields = allFields.filter((f) => formData[f.key]);

  const goTo = useCallback((step, dir) => {
    if (animating || step < 0 || step >= totalSteps) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setChipKey((k) => k + 1);
      setAnimating(false);
    }, 280);
  }, [animating, totalSteps]);

  const handleNext = useCallback(() => {
    if (isRequired && !hasValue) return;
    if (isLastStep) { onSave(); return; }
    goTo(currentStep + 1, 1);
  }, [isRequired, hasValue, isLastStep, currentStep, goTo, onSave]);

  const handleBack = useCallback(() => {
    goTo(currentStep - 1, -1);
  }, [currentStep, goTo]);

  const handleSkip = () => {
    if (!isRequired && !isLastStep) goTo(currentStep + 1, 1);
  };

  // ── Chip selection with reaction + celebration ──
  const handleChipSelect = (key, value) => {
    onChipSelect(key, value);

    // Show reaction
    const reactions = field.reactions || ["Got it!"];
    const text = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction({ text, emoji: pickEmoji() });
    setTimeout(() => setReaction(null), 1400);

    // Check if this completes the section
    if (isLastInSection && !isLastStep) {
      // Section celebration
      setTimeout(() => {
        setCelebration({
          title: `${currentSection.title} — done!`,
          subtitle: currentSection.celebration || "Nice work!",
        });
        setTimeout(() => {
          setCelebration(null);
          goTo(currentStep + 1, 1);
        }, 1600);
      }, 800);
    } else if (!isLastStep) {
      // Normal auto-advance
      setTimeout(() => goTo(currentStep + 1, 1), 700);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleNext, handleBack]);

  if (!field) return null;

  // ── Section celebration overlay ──
  if (celebration) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-6">
        <div style={{ animation: "celebEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
          {/* Big checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              backgroundColor: toRgba(colors.fourth, 0.15),
              border: `3px solid ${colors.fourth}`,
              animation: "celebCheck 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.1s",
            }}
          >
            <Check style={{ fontSize: 40, color: colors.fourth }} />
          </div>
          <h2 className="text-xl font-bold dark:text-dark-text text-light-text text-center">
            {celebration.title}
          </h2>
          <p className="text-sm dark:text-dark-text/50 text-light-text/50 text-center mt-1">
            {celebration.subtitle}
          </p>
          {/* Decorative sparkles */}
          <div className="flex justify-center gap-2 mt-4">
            {["✨", "🎉", "✨"].map((e, i) => (
              <span
                key={i}
                className="text-xl"
                style={{
                  animation: `celebSparkle 0.4s ease-out both ${0.2 + i * 0.15}s`,
                }}
              >
                {e}
              </span>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes celebEnter {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes celebCheck {
            from { transform: scale(0.5); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
          }
          @keyframes celebSparkle {
            from { opacity: 0; transform: translateY(8px) scale(0.5); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Progress header ── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-3 pb-2">
        {/* Section tabs */}
        <div className="flex items-center gap-3 mb-2.5">
          {sections.map((s) => {
            const isActive = s.id === currentSection?.id;
            const sectionDone = s.fields.every((f) => formData[f.key]);
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                {sectionDone ? (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    <Check style={{ fontSize: 10, color: "#fff" }} />
                  </div>
                ) : (
                  <div
                    className="w-4 h-4 rounded-full border-2 transition-all"
                    style={{
                      borderColor: isActive ? colors.fourth : toRgba(colors.fourth, 0.2),
                      backgroundColor: isActive ? toRgba(colors.fourth, 0.15) : "transparent",
                    }}
                  />
                )}
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isActive
                      ? "dark:text-dark-text text-light-text"
                      : "dark:text-dark-text/30 text-light-text/30"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: colors.fourth }}
          />
        </div>
      </div>

      {/* ── Scrollable question + chips area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 sm:px-10">
        <div
          className={`w-full max-w-lg mx-auto pt-3 pb-2 transition-all duration-300 ${
            animating
              ? direction > 0
                ? "opacity-0 translate-y-8"
                : "opacity-0 -translate-y-8"
              : "opacity-100 translate-y-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          {/* Warm tagline */}
          {field.tagline && (
            <p
              className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-center mb-2"
              style={{ color: toRgba(colors.fourth, 0.6) }}
            >
              {field.tagline}
            </p>
          )}

          {/* Big question */}
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold dark:text-dark-text text-light-text text-center leading-tight">
            {field.question}
          </h2>

          {/* Why subtitle */}
          {field.why && (
            <p className="text-xs sm:text-sm dark:text-dark-text/40 text-light-text/40 text-center mt-1.5 mb-4">
              {field.why}
            </p>
          )}
          {!field.why && <div className="mb-4" />}

          {/* Card-style chips */}
          <ChipField
            key={chipKey}
            fieldKey={field.key}
            options={getOptionsForField(field.key)}
            value={formData[field.key]}
            onChange={handleChipSelect}
            stagger
            hideLabel
            cardMode
          />

          {/* Reaction — appears below chips after selection */}
          <div className="h-8 flex items-center justify-center mt-2">
            {reaction ? (
              <div
                key={reaction.text}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  border: `1px solid ${toRgba(colors.fourth, 0.25)}`,
                  animation: "reactionFloat 1.4s ease-out forwards",
                }}
              >
                <span className="text-base">{reaction.emoji}</span>
                <span className="text-sm font-medium" style={{ color: colors.fourth }}>
                  {reaction.text}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Fixed navigation — always visible ── */}
      <div className="flex-shrink-0 flex flex-col items-center px-5 pt-2 pb-1.5 gap-2">
        {/* Primary action — Continue / Save */}
        <button
          onClick={handleNext}
          disabled={(isRequired && !hasValue) || (isLastStep && !allRequiredFilled) || saving}
          className="flex items-center justify-center gap-2 w-full max-w-[220px] py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.fourth,
            boxShadow: hasValue ? `0 4px 16px ${toRgba(colors.fourth, 0.3)}` : "none",
          }}
        >
          {saving && <CircularProgress size={14} style={{ color: "white" }} />}
          {isLastStep ? (
            <>
              <Check style={{ fontSize: 18 }} />
              Save Profile
            </>
          ) : (
            <>
              Continue
              <ArrowForward style={{ fontSize: 16 }} />
            </>
          )}
        </button>

        {/* Secondary actions — Back & Skip */}
        <div className="flex items-center gap-6">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: toRgba(colors.fourth, 0.5) }}
            >
              <ArrowBack style={{ fontSize: 13 }} />
              Back
            </button>
          )}
          <span className="text-[10px] dark:text-dark-text/20 text-light-text/20">
            {currentStep + 1} / {totalSteps}
          </span>
          {!isRequired && !isLastStep && (
            <button
              onClick={handleSkip}
              className="text-[11px] font-medium transition-opacity hover:opacity-70"
              style={{ color: toRgba(colors.fourth, 0.5) }}
            >
              Skip
              <ArrowForward style={{ fontSize: 13, marginLeft: 2, verticalAlign: "middle" }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Style DNA strip ── */}
      {filledFields.length > 0 && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-1 overflow-hidden">
          <div className="flex items-center gap-1.5 justify-center overflow-x-auto no-scrollbar">
            {filledFields.map((f) => (
              <span
                key={f.key}
                className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.12),
                  color: colors.fourth,
                  animation: "dnaTagEnter 0.3s ease-out both",
                }}
              >
                {formData[f.key]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes reactionFloat {
          0%   { opacity: 0; transform: translateY(10px) scale(0.9); }
          15%  { opacity: 1; transform: translateY(0) scale(1); }
          70%  { opacity: 1; transform: translateY(-8px) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }
        @keyframes dnaTagEnter {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default WizardMode;
