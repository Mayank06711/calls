import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowBack,
  Shuffle,
  BookmarkBorder,
  Bookmark,
  History,
  ExpandMore,
  ShoppingBag,
  OpenInNew,
  Save,
  InfoOutlined,
} from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import {
  fetchSuggestionThunk,
  saveOutfitThunk,
  fetchOutfitsThunk,
  fetchStyleProfileThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import { clearSuggestion } from "../../../../../redux/actions/wardrobe.actions";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import OutfitCard from "../Outfits/OutfitCard";
import { ColorDots } from "../shared/ColorDots";

// ──────────────────────────────────────────────────────────────────────────────
// Auto-defaults
// ──────────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getItemName(item) {
  if (!item) return "";
  return item.name || item.subcategory || item.item || "";
}

function getItemEmoji(name) {
  const n = (name || "").toLowerCase();
  if (/shirt|top|kurta|tee|blouse|polo/.test(n)) return "👕";
  if (/jean|trouser|pant|chino|short|skirt/.test(n)) return "👖";
  if (/jacket|blazer|coat|layer|cardigan|hoodie|sweater/.test(n)) return "🧥";
  if (/shoe|sneaker|boot|loafer|heel|sandal|footwear|derby|oxford/.test(n)) return "👟";
  return "👔";
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function OutfitItemRow({ item, wardrobeMatches, productRecommendations, colors }) {
  const name = getItemName(item);
  const color = item?.color || item?.shade || "";
  const matches = wardrobeMatches[name] || [];
  const owned = matches.length > 0;
  const photo = matches[0]?.thumbnailUrl || matches[0]?.photoUrl;
  const recs = productRecommendations[name] || [];
  const rec = recs[0];

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1">
      {/* 36x36 thumbnail */}
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dark-secondary">
        {photo ? (
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="flex items-center justify-center w-full h-full text-base">
            {getItemEmoji(name)}
          </span>
        )}
      </div>
      {/* Name + color */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium dark:text-dark-text/90 text-light-text/90 truncate">
          {name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {matches[0]?.dominantColors && (
            <ColorDots colors={matches[0].dominantColors} max={2} size="sm" />
          )}
          {(matches[0]?.dominantColors?.[0]?.name || color) && (
            <span className="text-[9px] dark:text-dark-text/50 text-light-text/50 truncate">
              {matches[0]?.dominantColors?.[0]?.name || color}
            </span>
          )}
        </div>
      </div>
      {/* Status: owned label or shop link */}
      {owned ? (
        <span className="text-[9px] font-medium text-green-600 dark:text-green-400 flex-shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          Owned
        </span>
      ) : rec ? (
        <a
          href={rec.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0.5 text-[9px] font-medium flex-shrink-0 hover:underline"
          style={{ color: colors.fourth }}
          onClick={(e) => { if (!rec.link) e.preventDefault(); }}
        >
          <ShoppingBag style={{ fontSize: 11 }} />
          {rec.price ? `₹${rec.price}` : "Shop"}
        </a>
      ) : (
        <span className="text-[9px] dark:text-dark-text/30 text-light-text/30 flex-shrink-0">
          Suggested
        </span>
      )}
    </div>
  );
}

function AltChipRow({ label, items, category, wardrobeMatches, activeIndex, onSwap, colors }) {
  return (
    <div className="mb-2.5">
      <p className="text-[9px] font-medium dark:text-dark-text/40 text-light-text/40 mb-1 uppercase tracking-wider">
        {label}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {items.map((item, idx) => {
          const name = getItemName(item);
          const matches = wardrobeMatches[name] || [];
          const photo = matches[0]?.thumbnailUrl || matches[0]?.photoUrl;
          const owned = matches.length > 0;
          const isActive = activeIndex === idx;

          return (
            <button
              key={idx}
              onClick={() => onSwap(category, idx)}
              className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all hover:shadow-sm"
              style={{
                borderColor: isActive ? colors.fourth : "transparent",
                boxShadow: isActive ? `0 0 0 1px ${colors.fourth}` : undefined,
              }}
              title={name}
            >
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-dark-secondary">
                  <span className="text-sm">{getItemEmoji(name)}</span>
                </div>
              )}
              {owned && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MiniProductRec({ product, colors }) {
  return (
    <a
      href={product.link || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-28 rounded-lg border overflow-hidden hover:shadow-sm transition-shadow dark:bg-dark-primary bg-light-secondary"
      style={{ borderColor: toRgba(colors.fourth, 0.2) }}
      onClick={(e) => { if (!product.link) e.preventDefault(); }}
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-20 object-cover" />
      ) : (
        <div className="w-full h-20 flex items-center justify-center" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
          <ShoppingBag style={{ fontSize: 20, opacity: 0.2 }} className="dark:text-dark-text text-light-text" />
        </div>
      )}
      <div className="p-1.5">
        <p className="text-[9px] font-medium dark:text-dark-text/80 text-light-text/80 truncate">
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          {product.brand && (
            <span className="text-[8px] dark:text-dark-text/40 text-light-text/40 truncate">
              {product.brand}
            </span>
          )}
          {product.price && (
            <span className="text-[9px] font-bold" style={{ color: colors.fourth }}>
              ₹{product.price}
            </span>
          )}
        </div>
        {product.link && (
          <div className="flex items-center gap-0.5 mt-1" style={{ color: colors.fourth }}>
            <OpenInNew style={{ fontSize: 9 }} />
            <span className="text-[8px] font-medium">Shop</span>
          </div>
        )}
      </div>
    </a>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────────

function FullOutfit() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, result, error } = useSelector((s) => s.wardrobe.suggestions);
  const { saving: savingOutfit, saved: savedOutfits } = useSelector((s) => s.wardrobe.outfits);
  const styleProfile = useSelector((s) => s.wardrobe.styleProfile?.data);

  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [swappedItems, setSwappedItems] = useState({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Fetch saved outfits + style profile on mount
  useEffect(() => {
    dispatch(fetchOutfitsThunk());
    dispatch(fetchStyleProfileThunk());
  }, [dispatch]);

  // Auto-fill occasion & season from style DNA
  useEffect(() => {
    if (occasion && season) return; // already set
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
      const t = setTimeout(() => dispatch(clearSuggestion()), 5000);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  // Reset saved/swap state when result changes
  useEffect(() => {
    setSaved(false);
    setSwappedItems({});
  }, [result]);

  const handleGenerate = () => {
    if (!occasion || !season || loading) return;
    const params = { occasion, season };
    if (description.trim()) params.description = description.trim();
    dispatch(fetchSuggestionThunk("full-outfit", params));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleClear = () => {
    dispatch(clearSuggestion());
  };

  // ── Parse result ──────────────────────────────────────────────────────────
  const suggestion = result?.suggestion || result;
  const wardrobeMatches = result?.wardrobeMatches || {};
  const productRecommendations = result?.productRecommendations || {};

  const topItem = suggestion?.top;
  const bottomItems = suggestion?.bottom || [];
  const layerItems = suggestion?.layers?.options || [];
  const footwearItems = suggestion?.footwear?.options || [];

  const vibeNote = suggestion?.overallVibe || suggestion?.note || suggestion?.stylingTip || "";

  const primaryBottom = bottomItems[0] || null;
  const primaryLayer = layerItems[0] || null;
  const primaryFootwear = footwearItems[0] || null;

  // Alt items
  const altBottoms = bottomItems.slice(1);
  const altLayers = layerItems.slice(1);
  const altFootwear = footwearItems.slice(1);
  const hasAlts = altBottoms.length > 0 || altLayers.length > 0 || altFootwear.length > 0;

  // ── Effective items after swaps ───────────────────────────────────────────
  const effectiveBottom = swappedItems.bottom != null ? bottomItems[swappedItems.bottom + 1] : primaryBottom;
  const effectiveLayer = swappedItems.layer != null ? layerItems[swappedItems.layer + 1] : primaryLayer;
  const effectiveFootwear = swappedItems.footwear != null ? footwearItems[swappedItems.footwear + 1] : primaryFootwear;
  const effectivePrimaryItems = [topItem, effectiveBottom, effectiveLayer, effectiveFootwear].filter(Boolean);
  const hasAnySwap = Object.values(swappedItems).some((v) => v != null);

  const handleSwap = useCallback((category, altIndex) => {
    setSwappedItems((prev) => ({
      ...prev,
      [category]: prev[category] === altIndex ? undefined : altIndex,
    }));
    setSaved(false);
  }, []);

  // ── Save outfit ───────────────────────────────────────────────────────────
  const handleOpenSave = () => {
    setSaveName(`AI: ${occasion || "Outfit"} - ${season || "Look"}`);
    setShowSavePrompt(true);
  };

  const handleSaveOutfit = async () => {
    const itemIds = [];
    for (const item of effectivePrimaryItems) {
      const name = getItemName(item);
      const matches = wardrobeMatches[name] || [];
      if (matches[0]?._id) itemIds.push(matches[0]._id);
    }
    if (itemIds.length === 0) return;

    const outfitData = {
      name: saveName.trim() || `AI: ${occasion} - ${season}`,
      itemIds,
      occasion: occasion || undefined,
      season: season || undefined,
      tags: ["ai-generated"],
      source: "ai_suggested",
    };
    if (vibeNote) outfitData.notes = vibeNote;
    if (!hasAnySwap && suggestion?.flatlayUrl) outfitData.flatlayUrl = suggestion.flatlayUrl;
    if (suggestion?.colorPalette?.length > 0) outfitData.colorPalette = suggestion.colorPalette;

    setShowSavePrompt(false);
    const res = await dispatch(saveOutfitThunk(outfitData));
    if (res) setSaved(true);
  };

  // ── Product recommendations for un-owned items ────────────────────────────
  const unownedWithRecs = effectivePrimaryItems
    .map((item) => {
      const name = getItemName(item);
      const owned = (wardrobeMatches[name] || []).length > 0;
      const recs = productRecommendations[name] || [];
      return !owned && recs.length > 0 ? { item, recs } : null;
    })
    .filter(Boolean);

  // ── AI-saved outfits for history ──────────────────────────────────────────
  const aiSavedOutfits = (savedOutfits || []).filter(
    (o) => o.source === "ai_suggested" || o.source === "engine_suggested"
  );

  // Count of owned items (for save button state)
  const ownedCount = effectivePrimaryItems.filter((item) => {
    const name = getItemName(item);
    return (wardrobeMatches[name] || []).length > 0;
  }).length;

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 relative z-10 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between pr-12">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => {
              if (result) {
                handleClear();
              } else {
                navigate("/wardrobe");
              }
            }} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <div>
              <h2 className="text-base font-bold dark:text-dark-text text-light-text">
                AI Stylist
              </h2>
              <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 leading-relaxed">
                Get a complete outfit suggestion based on your wardrobe
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {aiSavedOutfits.length > 0 && (
              <IconButton
                onClick={() => setShowHistory((p) => !p)}
                size="small"
                title="Saved outfits"
              >
                <History style={{ color: showHistory ? colors.fourth : toRgba(colors.fourth, 0.8), fontSize: 20 }} />
              </IconButton>
            )}
            {result && (
              <IconButton onClick={handleGenerate} disabled={loading} size="small" title="Shuffle">
                <Shuffle style={{ color: colors.fourth, fontSize: 20 }} />
              </IconButton>
            )}
          </div>
        </div>

        {/* Auto-defaults hint */}
        {defaultsApplied && (
          <p className="text-[9px] mt-1 ml-10 animate-pulse" style={{ color: colors.fourth }}>
            <InfoOutlined style={{ fontSize: 10, marginRight: 2, verticalAlign: "middle" }} />
            {styleProfile ? "Pre-filled from your style profile" : "Pre-filled with defaults — set up your Style DNA for personalized picks"}
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

      {/* ── Scrollable Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2.5 mb-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ── Result ────────────────────────────────────────────────────────── */}
      {suggestion && (
        <div className="space-y-4">

          {/* Magazine spread: flat-lay + item list */}
          <div className="flex gap-3 items-start">
            {/* Left: Flat-lay */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => setLightboxOpen(true)}>
              <OutfitFlatLay
                top={topItem}
                bottom={effectiveBottom}
                layer={effectiveLayer}
                footwear={effectiveFootwear}
                flatlayUrl={hasAnySwap ? null : suggestion?.flatlayUrl}
                size="md"
                wardrobeMatches={wardrobeMatches}
              />
            </div>
            {/* Right: Item list */}
            <div className="flex-1 min-w-0">
              <div className="divide-y dark:divide-dark-text/5 divide-light-text/5">
                {effectivePrimaryItems.map((item, idx) => (
                  <OutfitItemRow key={idx} item={item} wardrobeMatches={wardrobeMatches} productRecommendations={productRecommendations} colors={colors} />
                ))}
              </div>
            </div>
          </div>

          {/* Vibe note */}
          {vibeNote && (
            <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 italic text-center leading-relaxed">
              {vibeNote}
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={saved ? undefined : handleOpenSave}
              disabled={savingOutfit || saved || ownedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: saved ? "#22c55e" : colors.fourth }}
            >
              {savingOutfit ? (
                <CircularProgress size={12} style={{ color: "white" }} />
              ) : saved ? (
                <Bookmark style={{ fontSize: 14 }} />
              ) : (
                <BookmarkBorder style={{ fontSize: 14 }} />
              )}
              {saved ? "Saved!" : "Save Outfit"}
            </button>
            <div className="flex items-center gap-1 ml-auto">
              {occasion && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
                  {occasion}
                </span>
              )}
              {season && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
                  {season}
                </span>
              )}
            </div>
          </div>

          {/* ── Swap Alternatives ──────────────────────────────────────── */}
          {hasAlts && (
            <div className="pt-3 border-t" style={{ borderColor: toRgba(colors.fourth, 0.12) }}>
              <p className="text-[10px] font-semibold dark:text-dark-text/45 text-light-text/45 uppercase tracking-wider mb-2.5">
                Swap Alternatives
              </p>

              {altBottoms.length > 0 && (
                <AltChipRow
                  label="Bottoms"
                  items={altBottoms}
                  category="bottom"
                  wardrobeMatches={wardrobeMatches}
                  activeIndex={swappedItems.bottom}
                  onSwap={handleSwap}
                  colors={colors}
                />
              )}
              {altLayers.length > 0 && (
                <AltChipRow
                  label="Layers"
                  items={altLayers}
                  category="layer"
                  wardrobeMatches={wardrobeMatches}
                  activeIndex={swappedItems.layer}
                  onSwap={handleSwap}
                  colors={colors}
                />
              )}
              {altFootwear.length > 0 && (
                <AltChipRow
                  label="Footwear"
                  items={altFootwear}
                  category="footwear"
                  wardrobeMatches={wardrobeMatches}
                  activeIndex={swappedItems.footwear}
                  onSwap={handleSwap}
                  colors={colors}
                />
              )}
            </div>
          )}

          {/* ── Product Recommendations ────────────────────────────────── */}
          {unownedWithRecs.length > 0 && (
            <div className="pt-3 border-t" style={{ borderColor: toRgba(colors.fourth, 0.12) }}>
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingBag style={{ fontSize: 13, color: colors.fourth }} />
                <p className="text-[10px] font-semibold dark:text-dark-text/45 text-light-text/45 uppercase tracking-wider">
                  Complete Your Look
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {unownedWithRecs.flatMap(({ recs }) => recs).map((rec, idx) => (
                  <MiniProductRec key={idx} product={rec} colors={colors} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Saved AI Outfits History ──────────────────────────────────────── */}
      {((showHistory && aiSavedOutfits.length > 0) ||
        (!suggestion && !loading && aiSavedOutfits.length > 0)) && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold dark:text-dark-text/60 text-light-text/60">
              Saved AI Outfits ({aiSavedOutfits.length})
            </p>
            <button
              onClick={() => navigate("/wardrobe/outfits")}
              className="text-[10px] font-medium hover:underline"
              style={{ color: colors.fourth }}
            >
              View All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {aiSavedOutfits.slice(0, 6).map((outfit) => (
              <OutfitCard
                key={outfit._id}
                outfit={outfit}
                onClick={() => navigate(`/wardrobe/outfits/${outfit._id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state (no result, no history) ──────────────────────────── */}
      {!suggestion && !loading && aiSavedOutfits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <span className="text-4xl mb-3 opacity-20">✨</span>
          <p className="text-sm dark:text-dark-text/40 text-light-text/40 text-center">
            Pick occasion & season, then hit Go
          </p>
        </div>
      )}
      </div>

      {/* ── Save name prompt ────────────────────────────────────────────── */}
      {showSavePrompt && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50"
          onClick={() => setShowSavePrompt(false)}
        >
          <div
            className="rounded-2xl p-5 w-[320px] shadow-2xl dark:bg-dark-primary bg-light-secondary border"
            style={{ borderColor: toRgba(colors.fourth, 0.2) }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold dark:text-dark-text text-light-text mb-3">
              Name Your Outfit
            </h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveOutfit()}
              placeholder="e.g. Smart Casual Friday"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border text-xs dark:bg-dark-primary bg-white dark:text-dark-text text-light-text focus:outline-none focus:ring-1 transition-all"
              style={{ borderColor: toRgba(colors.fourth, 0.3), outlineColor: colors.fourth }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSavePrompt(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border dark:text-dark-text/60 text-light-text/60 transition-all hover:shadow-sm"
                style={{ borderColor: toRgba(colors.fourth, 0.2) }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutfit}
                disabled={savingOutfit}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                style={{ backgroundColor: colors.fourth }}
              >
                {savingOutfit ? <CircularProgress size={10} style={{ color: "white" }} /> : <Save style={{ fontSize: 13 }} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightboxOpen && suggestion && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative w-[90vw] max-w-[400px] aspect-square rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#f5f5f0" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!hasAnySwap && suggestion?.flatlayUrl ? (
              <img
                src={suggestion.flatlayUrl}
                alt="Outfit flat-lay"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <OutfitFlatLay
                  top={topItem}
                  bottom={effectiveBottom}
                  layer={effectiveLayer}
                  footwear={effectiveFootwear}
                  size="lg"
                  wardrobeMatches={wardrobeMatches}
                />
              </div>
            )}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FullOutfit;
