import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, Edit, InfoOutlined } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import ChipField from "../shared/ChipField";

/* ── Hero fields get larger tiles (span 2 cols) ── */
const HERO_KEYS = new Set(["bodyShape", "styleVibe"]);

/* ── AI insight mappings ── */

// Which pipeline analyzers map to which section
const SECTION_ANALYZERS = {
  about: ["body", "skin", "face"],
  style: [],
  details: ["face_geo", "hair"],
};

// Which description keys to show per section
const SECTION_DESC_KEYS = {
  about: ["body"],
  style: ["colorSeason"],
  details: ["face", "hair"],
};

// Which tiles get a detected-color hex dot
const TILE_HEX_GETTER = {
  skinTone: (dna) => dna?.skin?.hex,
  hairColor: (dna) => dna?.hair?.color?.hex,
};

function getSectionConfidence(sectionId, confidence) {
  if (!confidence) return null;
  const keys = SECTION_ANALYZERS[sectionId] || [];
  const vals = keys.map((k) => confidence[k]).filter((v) => typeof v === "number");
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100);
}

function getSectionDescription(sectionId, descriptions) {
  if (!descriptions) return null;
  const keys = SECTION_DESC_KEYS[sectionId] || [];
  const parts = keys.map((k) => descriptions[k]).filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function formatSubSeason(s) {
  if (!s) return null;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Bento tile ── */
function BentoTile({ field, value, isHero, isEditing, onTap, colors, hexColor }) {
  const hasValue = !!value;

  return (
    <button
      onClick={onTap}
      className={`relative group text-left rounded-xl border transition-all duration-200 overflow-hidden ${
        isHero ? "col-span-2 p-3" : "p-2.5"
      }`}
      style={{
        borderColor: isEditing
          ? colors.fourth
          : hasValue
            ? toRgba(colors.fourth, 0.2)
            : toRgba(colors.fourth, 0.1),
        backgroundColor: isEditing
          ? toRgba(colors.fourth, 0.08)
          : hasValue
            ? toRgba(colors.fourth, 0.04)
            : "transparent",
        boxShadow: isEditing
          ? `0 0 0 1px ${toRgba(colors.fourth, 0.15)}`
          : "none",
      }}
    >
      {/* Edit icon on hover */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: toRgba(colors.fourth, 0.4) }}
      >
        <Edit style={{ fontSize: 12 }} />
      </div>

      {/* Label */}
      <p
        className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: toRgba(colors.fourth, 0.5) }}
      >
        {field.label}
        {field.required && <span className="text-red-400/60 ml-0.5">*</span>}
      </p>

      {/* Value */}
      {hasValue ? (
        <p
          className={`font-bold dark:text-dark-text text-light-text leading-snug ${
            isHero ? "text-sm" : "text-[13px]"
          }`}
        >
          {value}
        </p>
      ) : (
        <p
          className={`italic ${isHero ? "text-xs" : "text-[11px]"}`}
          style={{ color: toRgba(colors.fourth, 0.3) }}
        >
          Tap to set
        </p>
      )}

      {/* Detected color swatch */}
      {hexColor && (
        <div
          className="absolute bottom-2 right-5 w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: hexColor, border: "1px solid rgba(255,255,255,0.15)" }}
          title={`Detected: ${hexColor}`}
        />
      )}

      {/* Filled indicator dot */}
      {hasValue && (
        <div
          className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.fourth }}
        />
      )}
    </button>
  );
}

/* ── Color Palette Strip ── */
function PaletteStrip({ colorSeason, colors }) {
  if (!colorSeason?.palette?.length) return null;

  const subSeason = formatSubSeason(colorSeason.subSeason);

  return (
    <div
      className="mt-2 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: toRgba(colors.fourth, 0.03),
        border: `1px solid ${toRgba(colors.fourth, 0.08)}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: toRgba(colors.fourth, 0.4) }}
        >
          Your Colors
        </span>
        {subSeason && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: toRgba(colors.fourth, 0.08),
              color: toRgba(colors.fourth, 0.6),
            }}
          >
            {subSeason}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {colorSeason.palette.map((hex, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full flex-shrink-0 transition-transform hover:scale-110"
            style={{
              backgroundColor: hex,
              border: "1.5px solid rgba(255,255,255,0.12)",
              boxShadow: `0 1px 4px ${hex}40`,
            }}
            title={hex}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Body Proportions Card ── */
function ProportionsCard({ body, colors }) {
  if (!body) return null;
  const { shoulderHipRatio, waistHipRatio, torsoLegRatio } = body;
  if (!shoulderHipRatio && !waistHipRatio && !torsoLegRatio) return null;

  const stats = [
    shoulderHipRatio && { label: "Shoulder : Hip", value: shoulderHipRatio.toFixed(2) },
    waistHipRatio && { label: "Waist : Hip", value: waistHipRatio.toFixed(2) },
    torsoLegRatio && { label: "Torso : Leg", value: torsoLegRatio.toFixed(2) },
  ].filter(Boolean);

  return (
    <div
      className="mt-2 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: toRgba(colors.fourth, 0.03),
        border: `1px solid ${toRgba(colors.fourth, 0.08)}`,
      }}
    >
      <span
        className="text-[9px] font-semibold uppercase tracking-wider"
        style={{ color: toRgba(colors.fourth, 0.4) }}
      >
        Body Proportions
      </span>
      <div className="flex items-center gap-3 mt-1.5">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center">
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: colors.fourth }}
            >
              {s.value}
            </span>
            <span
              className="text-[8px] tracking-wide"
              style={{ color: toRgba(colors.fourth, 0.4) }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditMode({
  sections,
  formData,
  onChipSelect,
  getOptionsForField,
  onSave,
  saving,
  allRequiredFilled,
  completionPct = 0,
  styleDna,
}) {
  const colors = useSubscriptionColors();
  const [editingField, setEditingField] = useState(null);
  const [dirty, setDirty] = useState(false);
  const editRef = useRef(null);
  const saveTimerRef = useRef(null);
  const onSaveRef = useRef(onSave);

  // Keep ref in sync so debounced timer always calls latest onSave
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const toggleEdit = (key) => {
    setEditingField((prev) => (prev === key ? null : key));
  };

  // Auto-scroll edit area into view when it opens
  useEffect(() => {
    if (editingField && editRef.current) {
      setTimeout(() => {
        editRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [editingField]);

  // Auto-save after chip change (debounced 800ms)
  const handleChipChange = useCallback((key, val) => {
    onChipSelect(key, val);
    setDirty(true);
    setTimeout(() => setEditingField(null), 300);

    // Debounce — clears previous timer, waits 800ms after last change
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onSaveRef.current();
      setDirty(false);
    }, 800);
  }, [onChipSelect]);

  // Manual save — clears pending debounce to avoid double-save
  const handleManualSave = useCallback(() => {
    if (!dirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    onSave();
    setDirty(false);
  }, [dirty, onSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ── Scrollable content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-4 py-3 space-y-3">
        {/* ── Sections with bento grids ── */}
        {sections.map((section) => {
          const sectionFilled = section.fields.every((f) => formData[f.key]);
          const conf = getSectionConfidence(section.id, styleDna?.confidence);
          const desc = getSectionDescription(section.id, styleDna?.descriptions);

          return (
            <div key={section.id}>
              {/* Section label + confidence */}
              <div className="flex items-center gap-2 mb-1 px-0.5">
                {sectionFilled ? (
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    <Check style={{ fontSize: 10, color: "#fff" }} />
                  </div>
                ) : (
                  <div
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: toRgba(colors.fourth, 0.25) }}
                  />
                )}
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: toRgba(colors.fourth, 0.45) }}
                >
                  {section.title}
                </span>
                {conf !== null && (
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: toRgba(colors.fourth, conf >= 80 ? 0.1 : 0.06),
                      color: toRgba(colors.fourth, conf >= 80 ? 0.6 : 0.4),
                    }}
                  >
                    {conf}% confidence
                  </span>
                )}
                <div
                  className="flex-1 h-px ml-1"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
                />
              </div>

              {/* AI description */}
              {desc && (
                <p
                  className="text-[10px] leading-relaxed px-7 mb-2"
                  style={{ color: toRgba(colors.fourth, 0.35) }}
                >
                  {desc}
                </p>
              )}

              {/* Bento grid — 2 cols on mobile, 3 cols on wider screens */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {section.fields.map((field) => {
                  const isHero = HERO_KEYS.has(field.key);
                  const isEditing = editingField === field.key;
                  const hexColor = TILE_HEX_GETTER[field.key]?.(styleDna) || null;

                  return (
                    <React.Fragment key={field.key}>
                      <BentoTile
                        field={field}
                        value={formData[field.key]}
                        isHero={isHero}
                        isEditing={isEditing}
                        onTap={() => toggleEdit(field.key)}
                        colors={colors}
                        hexColor={hexColor}
                      />

                      {/* Inline edit — spans full grid width */}
                      {isEditing && (
                        <div
                          ref={editRef}
                          className="col-span-2 sm:col-span-3 px-2 py-2.5 rounded-xl mb-1"
                          style={{
                            backgroundColor: toRgba(colors.fourth, 0.04),
                            border: `1px solid ${toRgba(colors.fourth, 0.12)}`,
                            animation: "editSlideIn 0.25s ease-out both",
                          }}
                        >
                          <ChipField
                            fieldKey={field.key}
                            label={field.label}
                            question={field.question}
                            options={getOptionsForField(field.key)}
                            value={formData[field.key]}
                            onChange={handleChipChange}
                            required={field.required}
                            compact
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Section-specific AI extras */}
              {section.id === "about" && styleDna?.body && (
                <ProportionsCard body={styleDna.body} colors={colors} />
              )}
              {section.id === "style" && styleDna?.colorSeason && (
                <PaletteStrip colorSeason={styleDna.colorSeason} colors={colors} />
              )}
            </div>
          );
        })}

        {/* ── AI disclaimer ── */}
        {styleDna && (
          <div className="flex items-center justify-center gap-1.5 pt-1 pb-2">
            <InfoOutlined style={{ fontSize: 11, color: toRgba(colors.fourth, 0.25) }} />
            <span
              className="text-[9px]"
              style={{ color: toRgba(colors.fourth, 0.25) }}
            >
              AI analysis can make mistakes — tap any field to correct it
            </span>
          </div>
        )}
      </div>

      {/* ── Sticky save bar ── */}
      <div className="flex-shrink-0 px-4 py-2 border-t dark:border-dark-text/10 border-light-text/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Completion ring */}
          <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke={toRgba(colors.fourth, 0.1)} strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={colors.fourth} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${completionPct * 0.9425} 94.25`} className="transition-all duration-500" />
            </svg>
            <span className="absolute text-[7px] font-bold" style={{ color: colors.fourth }}>
              {completionPct}%
            </span>
          </div>
          <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">
            {saving ? "Saving..." : dirty ? "Unsaved changes" : "All saved"}
          </span>
        </div>
        <button
          onClick={handleManualSave}
          disabled={!allRequiredFilled || saving || !dirty}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: colors.fourth,
            boxShadow: allRequiredFilled ? `0 4px 12px ${toRgba(colors.fourth, 0.3)}` : "none",
          }}
        >
          {saving && <CircularProgress size={14} style={{ color: "white" }} />}
          {saving ? "Saving" : "Save"}
        </button>
      </div>

      <style>{`
        @keyframes editSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default EditMode;
