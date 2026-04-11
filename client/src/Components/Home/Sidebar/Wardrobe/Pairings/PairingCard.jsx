import React, { useState } from "react";
import { Save, PhotoOutlined, AutoAwesome, Close } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { saveOutfitThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import { ColorDots } from "../shared/ColorDots";

// ── Variant grid classes (1-col mobile → 3-col desktop) ─────────────────────
const VARIANT_CLASSES = {
  hero: "row-span-2 sm:col-span-2",     // 1-col tall mobile, 2×2 desktop
  wide: "sm:col-span-2",                // full-width mobile, 2×1 desktop
  compact: "",                           // single cell everywhere
};

function PairingCard({ pairing, index, variant = "compact" }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { saving } = useSelector((s) => s.wardrobe.outfits);

  const [previewMode, setPreviewMode] = useState("flatlay");
  const [isSaving, setIsSaving] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");

  const top = pairing.top || {};
  const bottom = pairing.bottom || {};
  const vibe = pairing.vibe || "";
  const occasion = pairing.occasion || "";
  const season = pairing.season || "";

  const ownedLayers = pairing.layers?.owned || [];
  const ownedFootwear = pairing.footwear?.owned || [];
  const firstLayer = ownedLayers[0] || null;
  const firstShoe = ownedFootwear[0] || null;

  const palette = [];
  [top, bottom, firstLayer, firstShoe].filter(Boolean).forEach((item) => {
    (item.dominantColors || []).slice(0, 1).forEach((c) => {
      if (c.hex && !palette.find((p) => p.hex === c.hex)) palette.push(c);
    });
  });

  const toPhotoItem = (item) =>
    item ? { ...item, nobgUrl: undefined, photoUrl: item.thumbnailUrl || item.photoUrl } : null;

  const topName = top.subcategory || top.name || "Top";
  const bottomName = bottom.subcategory || bottom.name || "Bottom";
  const defaultName = `${topName} + ${bottomName}`;

  const allItems = [top, bottom, firstLayer, firstShoe].filter(Boolean);

  const handleOpenSave = (e) => {
    e.stopPropagation();
    setSaveName(defaultName);
    setShowNamePrompt(true);
  };

  const handleSave = async () => {
    const itemIds = [top._id, bottom._id, firstLayer?._id, firstShoe?._id].filter(Boolean);
    if (itemIds.length < 2) return;
    setIsSaving(true);
    setShowNamePrompt(false);
    const res = await dispatch(saveOutfitThunk({
      itemIds,
      occasion: occasion || undefined,
      season: season || undefined,
      name: saveName.trim() || defaultName,
      tags: ["ai-pairing"],
    }));
    setIsSaving(false);
    if (res?.data?._id) navigate(`/wardrobe/outfits/${res.data._id}`);
  };

  const toggleBtn = (size = 6, iconSize = 12) => (
    <button
      onClick={(e) => { e.stopPropagation(); setPreviewMode((m) => m === "flatlay" ? "photos" : "flatlay"); }}
      className={`w-${size} h-${size} rounded-full flex items-center justify-center bg-black/25 backdrop-blur-sm text-white/80 hover:bg-black/40 transition-colors`}
    >
      {previewMode === "flatlay" ? <PhotoOutlined style={{ fontSize: iconSize }} /> : <AutoAwesome style={{ fontSize: iconSize }} />}
    </button>
  );

  const isHero = variant === "hero";
  const isWide = variant === "wide";

  // ══════════════════════════════════════════════════════════════════════════════
  // HERO VARIANT — 2×2
  // Mobile: flat-lay fills entire card, gradient overlay with name + save
  // Desktop: side-by-side — flat-lay left + info panel right
  // ══════════════════════════════════════════════════════════════════════════════
  if (isHero) {
    return (
      <div
        className={`${VARIANT_CLASSES.hero} rounded-2xl overflow-hidden border relative group transition-shadow hover:shadow-lg`}
        style={{ borderColor: toRgba(colors.fourth, 0.15) }}
      >
        {/* ── Mobile: full-bleed flat-lay + gradient overlay ── */}
        <div className="sm:hidden absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#f5f5f0" }}>
          <OutfitFlatLay
            top={previewMode === "photos" ? toPhotoItem(top) : top}
            bottom={previewMode === "photos" ? toPhotoItem(bottom) : bottom}
            layer={previewMode === "photos" ? toPhotoItem(firstLayer) : firstLayer}
            footwear={previewMode === "photos" ? toPhotoItem(firstShoe) : firstShoe}
            size="lg"
          />
        </div>
        {/* Mobile: top bar */}
        <div className="sm:hidden absolute top-0 left-0 right-0 flex items-center justify-between px-2.5 pt-2 z-[1]">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold text-black/30">#{index + 1}</span>
            {vibe && (
              <span className="text-[7px] px-1.5 py-[2px] rounded-full font-semibold backdrop-blur-sm max-w-[80px] truncate" style={{ backgroundColor: toRgba(colors.fourth, 0.85), color: "#fff" }}>
                {vibe}
              </span>
            )}
          </div>
          {toggleBtn(6, 12)}
        </div>
        {/* Mobile: bottom gradient */}
        <div className="sm:hidden absolute bottom-0 left-0 right-0 z-[1] bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pb-2.5 pt-10">
          <p className="text-sm font-bold text-white leading-snug">{topName}</p>
          <p className="text-[11px] text-white/55 mb-2">× {bottomName}</p>
          <div className="flex items-center justify-between">
            {palette.length > 0 && (
              <div className="flex gap-1">
                {palette.slice(0, 4).map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex, border: "1.5px solid rgba(255,255,255,0.3)" }} />
                ))}
              </div>
            )}
            <button
              onClick={handleOpenSave}
              disabled={isSaving || saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
              style={{ backgroundColor: colors.fourth }}
            >
              {isSaving ? <CircularProgress size={10} style={{ color: "#fff" }} /> : <Save style={{ fontSize: 12 }} />}
              Save
            </button>
          </div>
        </div>

        {/* ── Desktop: side-by-side layout ── */}
        <div className="hidden sm:flex w-full h-full">
          {/* Left: flat-lay */}
          <div
            className="relative w-[55%] flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: "#f5f5f0" }}
          >
            <OutfitFlatLay
              top={previewMode === "photos" ? toPhotoItem(top) : top}
              bottom={previewMode === "photos" ? toPhotoItem(bottom) : bottom}
              layer={previewMode === "photos" ? toPhotoItem(firstLayer) : firstLayer}
              footwear={previewMode === "photos" ? toPhotoItem(firstShoe) : firstShoe}
              size="lg"
            />
            <div className="absolute top-2 right-2">{toggleBtn(6, 12)}</div>
          </div>

          {/* Right: info panel */}
          <div
            className="flex-1 min-w-0 flex flex-col justify-between"
            style={{ background: `linear-gradient(160deg, ${toRgba(colors.fourth, 0.05)}, transparent 70%)` }}
          >
            <div className="p-3 pb-0">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[9px] font-bold dark:text-dark-text/25 text-light-text/25">#{index + 1}</span>
                {vibe && (
                  <span className="text-[8px] px-2 py-[2px] rounded-full font-semibold" style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}>
                    {vibe}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-bold dark:text-dark-text/85 text-light-text/85 leading-snug mb-0.5">{topName}</p>
              <p className="text-[11px] dark:text-dark-text/45 text-light-text/45 mb-2.5">
                paired with <span className="font-semibold dark:text-dark-text/70 text-light-text/70">{bottomName}</span>
              </p>
              {(occasion || season) && (
                <div className="flex gap-1.5 flex-wrap mb-2.5">
                  {occasion && (
                    <span className="text-[7px] font-medium px-2 py-[3px] rounded-full" style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}>{occasion}</span>
                  )}
                  {season && (
                    <span className="text-[7px] font-medium px-2 py-[3px] rounded-full dark:bg-dark-text/8 bg-light-text/8 dark:text-dark-text/50 text-light-text/50">{season}</span>
                  )}
                </div>
              )}
              {palette.length > 1 && (
                <div className="flex items-center gap-1.5 mb-2.5">
                  {palette.slice(0, 4).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: c.hex, border: "1.5px solid rgba(255,255,255,0.15)" }} title={c.name} />
                  ))}
                  <span className="text-[8px] dark:text-dark-text/35 text-light-text/35 ml-0.5">{palette.slice(0, 2).map((c) => c.name).join(" × ")}</span>
                </div>
              )}
              {(firstLayer || firstShoe) && (
                <div className="flex flex-wrap gap-1">
                  {firstLayer && <span className="text-[8px] px-2 py-0.5 rounded-full dark:bg-dark-text/8 bg-light-text/8 dark:text-dark-text/50 text-light-text/50">{"\u{1F9E5}"} {firstLayer.subcategory || "Layer"}</span>}
                  {firstShoe && <span className="text-[8px] px-2 py-0.5 rounded-full dark:bg-dark-text/8 bg-light-text/8 dark:text-dark-text/50 text-light-text/50">{"\u{1F45F}"} {firstShoe.subcategory || "Shoes"}</span>}
                </div>
              )}
            </div>
            <div className="px-3 pb-2.5">
              <div className="flex gap-1 mb-2">
                {allItems.map((item, i) => {
                  const img = item.nobgUrl || item.thumbnailUrl || item.photoUrl;
                  return img ? (
                    <div key={i} className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "#eee" }}>
                      <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : null;
                })}
              </div>
              <button
                onClick={handleOpenSave}
                disabled={isSaving || saving}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: colors.fourth }}
              >
                {isSaving ? <CircularProgress size={10} style={{ color: "#fff" }} /> : <Save style={{ fontSize: 12 }} />}
                Save Outfit
              </button>
            </div>
          </div>
        </div>

        {showNamePrompt && <SavePrompt saveName={saveName} setSaveName={setSaveName} onSave={handleSave} onClose={() => setShowNamePrompt(false)} isSaving={isSaving} colors={colors} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // WIDE VARIANT — 2×1, flat-lay left, text right
  // ══════════════════════════════════════════════════════════════════════════════
  if (isWide) {
    return (
      <div
        className={`${VARIANT_CLASSES.wide} rounded-2xl overflow-hidden border relative flex group transition-shadow hover:shadow-md`}
        style={{ borderColor: toRgba(colors.fourth, 0.15) }}
      >
        {/* Left: flat-lay */}
        <div
          className="relative w-[38%] flex-shrink-0 flex items-center justify-center"
          style={{ backgroundColor: "#f5f5f0" }}
        >
          <OutfitFlatLay
            top={previewMode === "photos" ? toPhotoItem(top) : top}
            bottom={previewMode === "photos" ? toPhotoItem(bottom) : bottom}
            layer={previewMode === "photos" ? toPhotoItem(firstLayer) : firstLayer}
            footwear={previewMode === "photos" ? toPhotoItem(firstShoe) : firstShoe}
            size="md"
          />
          <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">{toggleBtn(5, 9)}</div>
        </div>

        {/* Right: info */}
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] font-bold dark:text-dark-text/25 text-light-text/25">#{index + 1}</span>
              {vibe && (
                <span className="text-[7px] px-1.5 py-[2px] rounded-full font-semibold" style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}>
                  {vibe}
                </span>
              )}
            </div>
            <p className="text-[11px] font-bold dark:text-dark-text/80 text-light-text/80 truncate">
              {topName} <span className="font-normal dark:text-dark-text/40 text-light-text/40">×</span> {bottomName}
            </p>
            {(firstLayer || firstShoe) && (
              <p className="text-[8px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                {[firstLayer?.subcategory, firstShoe?.subcategory].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            {palette.length > 1 && (
              <div className="flex gap-0.5 items-center">
                {palette.slice(0, 3).map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: c.hex, border: "1px solid rgba(255,255,255,0.1)" }} />
                ))}
                <span className="text-[7px] dark:text-dark-text/30 text-light-text/30 ml-1">{palette[0]?.name}</span>
              </div>
            )}
            <button
              onClick={handleOpenSave}
              disabled={isSaving || saving}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:shadow-sm disabled:opacity-40 transition-all"
              style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}
            >
              {isSaving ? <CircularProgress size={8} style={{ color: colors.fourth }} /> : <Save style={{ fontSize: 13 }} />}
            </button>
          </div>
        </div>

        {showNamePrompt && <SavePrompt saveName={saveName} setSaveName={setSaveName} onSave={handleSave} onClose={() => setShowNamePrompt(false)} isSaving={isSaving} colors={colors} />}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // COMPACT VARIANT — same style as hero: full-bleed flat-lay + gradient overlay
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={`${VARIANT_CLASSES.compact} rounded-2xl overflow-hidden border relative group transition-all hover:shadow-md`}
      style={{ borderColor: toRgba(colors.fourth, 0.12) }}
    >
      {/* Full-bleed flat-lay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "#f5f5f0" }}>
        <OutfitFlatLay
          top={previewMode === "photos" ? toPhotoItem(top) : top}
          bottom={previewMode === "photos" ? toPhotoItem(bottom) : bottom}
          layer={previewMode === "photos" ? toPhotoItem(firstLayer) : firstLayer}
          footwear={previewMode === "photos" ? toPhotoItem(firstShoe) : firstShoe}
          size="md"
        />
      </div>

      {/* Top bar: number + vibe */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2.5 pt-1.5 z-[5]">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold text-black/30">#{index + 1}</span>
          {vibe && (
            <span className="text-[7px] px-1.5 py-[2px] rounded-full font-semibold backdrop-blur-sm max-w-[80px] truncate" style={{ backgroundColor: toRgba(colors.fourth, 0.85), color: "#fff" }}>
              {vibe}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {toggleBtn(5, 10)}
        </div>
      </div>

      {/* Bottom gradient overlay — slim, same style as hero */}
      <div className="absolute bottom-0 left-0 right-0 z-[5] bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-5">
        <p className="text-[11px] font-semibold text-white truncate leading-tight mb-0.5" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{topName}</p>
        <p className="text-[9px] text-white/55 truncate leading-tight mb-1.5" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>× {bottomName}</p>
        <div className="flex items-center justify-between">
          {palette.length > 0 && (
            <div className="flex gap-1">
              {palette.slice(0, 3).map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex, border: "1px solid rgba(255,255,255,0.3)" }} />
              ))}
            </div>
          )}
          <button
            onClick={handleOpenSave}
            disabled={isSaving || saving}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: colors.fourth }}
          >
            {isSaving ? <CircularProgress size={8} style={{ color: "#fff" }} /> : <Save style={{ fontSize: 11 }} />}
            Save
          </button>
        </div>
      </div>

      {showNamePrompt && <SavePrompt saveName={saveName} setSaveName={setSaveName} onSave={handleSave} onClose={() => setShowNamePrompt(false)} isSaving={isSaving} colors={colors} />}
    </div>
  );
}

// ── Shared save-name prompt overlay ──────────────────────────────────────────
function SavePrompt({ saveName, setSaveName, onSave, onClose, isSaving, colors }) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
      onClick={onClose}
    >
      <div
        className="rounded-xl p-3 w-[85%] max-w-[240px] shadow-xl dark:bg-dark-primary bg-white border"
        style={{ borderColor: toRgba(colors.fourth, 0.2) }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold dark:text-dark-text text-light-text">Name this outfit</p>
          <button onClick={onClose} className="dark:text-dark-text/40 text-light-text/40 hover:dark:text-dark-text/70 hover:text-light-text/70">
            <Close style={{ fontSize: 12 }} />
          </button>
        </div>
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSave()}
          autoFocus
          className="w-full px-2 py-1.5 rounded-lg border text-[10px] dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none focus:ring-1"
          style={{ borderColor: toRgba(colors.fourth, 0.3), outlineColor: colors.fourth }}
        />
        <div className="flex justify-end gap-1.5 mt-2">
          <button onClick={onClose} className="px-2 py-1 rounded-lg text-[9px] font-medium border dark:text-dark-text/50 text-light-text/50" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-2.5 py-1 rounded-lg text-[9px] font-semibold text-white flex items-center gap-1 hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: colors.fourth }}
          >
            {isSaving ? <CircularProgress size={8} style={{ color: "#fff" }} /> : <Save style={{ fontSize: 10 }} />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default PairingCard;
