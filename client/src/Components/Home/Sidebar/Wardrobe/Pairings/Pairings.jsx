import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, AutoAwesome, InfoOutlined, ExpandMore } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { generatePairingsThunk, fetchClosetThunk, fetchStyleProfileThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import PairingCard from "./PairingCard";
import PremiumGate from "../shared/PremiumGate";

/* ── Auto-defaults (same pattern as AI Stylist / Mix & Match) ── */

function getAutoSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 5) return "Summer";
  if (m >= 6 && m <= 9) return "Monsoon";
  return "Winter";
}

function getAutoOccasion(profile) {
  if (!profile) return "Casual";
  const lt = profile.lifestyleTypes || [];
  if (lt.includes("Office Formal") || lt.includes("Office Casual")) return "Office: Daily Wear";
  if (lt.includes("Social Events")) return "Date Night";
  if (lt.includes("Casual")) return "Casual";
  if (lt.includes("Work From Home")) return "Lounge";
  const v = profile.styleVibe || "";
  if (v === "Classic" || v === "Old Money") return "Office: Daily Wear";
  if (v === "Trendy") return "Party: Night Out";
  if (v === "Desi") return "Festive";
  return "Casual";
}

function Pairings() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, data: pairings, unpaired, error } = useSelector(
    (state) => state.wardrobe.pairings
  );
  const { items: closetItems } = useSelector((state) => state.wardrobe.closet);
  const styleProfile = useSelector((s) => s.wardrobe.styleProfile?.data);

  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    if (closetItems.length === 0) dispatch(fetchClosetThunk());
    dispatch(fetchStyleProfileThunk());
  }, [dispatch, closetItems.length]);

  // Auto-fill occasion & season from style DNA
  useEffect(() => {
    if (occasion && season) return;
    const autoSeason = getAutoSeason();
    const autoOccasion = getAutoOccasion(styleProfile);
    if (!season) setSeason(autoSeason);
    if (!occasion) setOccasion(autoOccasion);
    setDefaultsApplied(true);
    const t = setTimeout(() => setDefaultsApplied(false), 4000);
    return () => clearTimeout(t);
  }, [styleProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => {
        // Clear the error by re-dispatching with empty
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleGenerate = () => {
    if (!occasion || !season) return;
    dispatch(generatePairingsThunk({ occasion, season, description: description.trim() || undefined }));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header — same layout as AI Stylist */}
      <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between pr-12">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigate(-1)} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <div>
              <h2 className="text-base font-bold dark:text-dark-text text-light-text">
                All Pairings
              </h2>
              <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 leading-relaxed">
                Every top-bottom combo from your closet, styled by AI
              </p>
            </div>
          </div>
        </div>

        {/* Auto-defaults hint */}
        {defaultsApplied && (
          <p className="text-[9px] mt-1 ml-10 animate-pulse" style={{ color: colors.fourth }}>
            <InfoOutlined style={{ fontSize: 10, marginRight: 2, verticalAlign: "middle" }} />
            {styleProfile ? "Pre-filled from your style profile" : "Pre-filled with defaults \u2014 set up your Style DNA for personalized picks"}
          </p>
        )}

        {/* Inline Controls — pinned below title */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 min-w-0">
            <OccasionSeasonPicker
              occasion={occasion}
              season={season}
              onOccasionChange={setOccasion}
              onSeasonChange={setSeason}
              compact
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!occasion || !season || loading}
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ backgroundColor: colors.fourth }}
          >
            {loading && <CircularProgress size={14} style={{ color: "white" }} />}
            Go
          </button>
        </div>

        {/* Optional description toggle */}
        <button
          onClick={() => setShowDescription((p) => !p)}
          className="text-[10px] font-medium mt-1.5 flex items-center gap-0.5 transition-colors"
          style={{ color: toRgba(colors.fourth, 0.67) }}
        >
          <ExpandMore
            style={{
              fontSize: 14,
              transform: showDescription ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
          {showDescription ? "Hide description" : "Add description"}
        </button>

        <div
          className="overflow-hidden transition-all duration-200"
          style={{ maxHeight: showDescription ? "100px" : "0px", opacity: showDescription ? 1 : 0 }}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you're looking for..."
            rows={2}
            className="w-full px-3 py-2 mt-1.5 rounded-lg border text-sm dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none focus:ring-2 transition-all resize-none"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
      <PremiumGate requiredTier="Silver" message="Pairings require Silver or above">

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results count */}
        {pairings.length > 0 && (
          <p className="text-xs dark:text-dark-text/50 text-light-text/50 mb-3">
            {pairings.length} outfit combos
          </p>
        )}

        {/* Loading skeletons — single col mobile, bento desktop */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:grid-flow-dense auto-rows-[160px] gap-2.5 mb-4">
            {/* Hero skeleton */}
            <div
              className="sm:col-span-2 sm:row-span-2 rounded-2xl overflow-hidden animate-pulse"
              style={{ backgroundColor: toRgba(colors.fourth, 0.06), border: `1px solid ${toRgba(colors.fourth, 0.12)}` }}
            />
            {/* compact skeletons — desktop only (right of hero) */}
            {[0, 1].map((i) => (
              <div
                key={`sc-${i}`}
                className="hidden sm:block rounded-2xl overflow-hidden animate-pulse"
                style={{ backgroundColor: toRgba(colors.fourth, 0.04), border: `1px solid ${toRgba(colors.fourth, 0.1)}`, animationDelay: `${i * 150}ms` }}
              />
            ))}
            {/* mobile compact skeletons */}
            {[0, 1].map((i) => (
              <div
                key={`mc-${i}`}
                className="sm:hidden rounded-2xl overflow-hidden animate-pulse"
                style={{ backgroundColor: toRgba(colors.fourth, 0.04), border: `1px solid ${toRgba(colors.fourth, 0.1)}`, animationDelay: `${(i + 2) * 150}ms` }}
              />
            ))}
          </div>
        )}

        {/* Pairing cards — single col mobile, bento desktop */}
        {!loading && pairings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:grid-flow-dense auto-rows-[160px] gap-2.5">
            {pairings.map((pairing, idx) => {
              let variant = "compact";
              if (idx === 0) variant = "hero";
              else if (pairings.length > 6 && idx > 2 && (idx - 3) % 5 === 0) variant = "wide";
              return <PairingCard key={idx} pairing={pairing} index={idx} variant={variant} />;
            })}
          </div>
        )}

        {/* Empty state — only show if no pairings AND not loading */}
        {pairings.length === 0 && !loading && !error && (
          <div
            className="w-full rounded-xl border border-dashed p-8 flex flex-col items-center gap-2 text-center"
            style={{ borderColor: toRgba(colors.fourth, 0.2) }}
          >
            <AutoAwesome style={{ fontSize: 28, color: toRgba(colors.fourth, 0.3) }} />
            <p className="text-xs dark:text-dark-text/40 text-light-text/40">
              Pick occasion & season, then tap{" "}
              <span className="font-semibold" style={{ color: colors.fourth }}>Go</span>{" "}
              to see every outfit combo from your closet
            </p>
          </div>
        )}

        {/* Unpaired */}
        {unpaired && (Array.isArray(unpaired) ? unpaired.length > 0 : (unpaired.tops?.length > 0 || unpaired.bottoms?.length > 0)) && (
          <div
            className="w-full rounded-xl border p-4 mt-4"
            style={{ borderColor: toRgba(colors.fourth, 0.2) }}
          >
            <h4 className="text-xs font-semibold mb-2 dark:text-dark-text/60 text-light-text/60">
              Unpaired Items
            </h4>
            <div className="space-y-1">
              {Array.isArray(unpaired)
                ? unpaired.map((item, idx) => (
                    <p key={idx} className="text-[10px] dark:text-dark-text/45 text-light-text/45">
                      {item.subcategory || item.name} \u2014 {item.reason || "no match found"}
                    </p>
                  ))
                : [...(unpaired.tops || []), ...(unpaired.bottoms || [])].map((item, idx) => (
                    <p key={idx} className="text-[10px] dark:text-dark-text/45 text-light-text/45">
                      {item.subcategory || item.name} \u2014 {item.reason || "no match found"}
                    </p>
                  ))
              }
            </div>
          </div>
        )}
      </PremiumGate>
      </div>
    </div>
  );
}

export default Pairings;
