import React from "react";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import WardrobeMatchBadge from "./WardrobeMatchBadge";

const CELL_EMOJI = {
  top: "👕",
  bottom: "👖",
  layer: "🧥",
  footwear: "👟",
};

const CELL_LABELS = {
  top: "Top",
  bottom: "Bottom",
  layer: "Layer",
  footwear: "Footwear",
};

const SIZE_MAP = {
  sm: { container: "w-[60px] h-[60px]", text: "text-[6px]", emoji: "text-sm", badge: false, overlay: false },
  md: { container: "w-[160px] h-[160px]", text: "text-[9px]", emoji: "text-xl", badge: true, overlay: true },
  lg: { container: "w-full max-w-[320px] aspect-square", text: "text-xs", emoji: "text-3xl", badge: true, overlay: true },
};

// CSS flat-lay positioning — mirrors Python's flat-lay composition
const FLATLAY_SLOTS = {
  layer: { top: "2%", left: "3%", width: "50%", height: "46%", transform: "rotate(-8deg)", zIndex: 1 },
  top: { top: "2%", left: "24%", width: "50%", height: "46%", transform: "rotate(3deg)", zIndex: 2 },
  bottom: { top: "38%", left: "20%", width: "54%", height: "50%", transform: "rotate(-1deg)", zIndex: 3 },
  footwear: { bottom: "2%", right: "5%", width: "34%", height: "20%", zIndex: 4 },
};

function getItemName(item) {
  if (!item) return "";
  return item.name || item.subcategory || item.item || "";
}

function getItemColor(item) {
  if (!item) return "";
  return item.dominantColors?.[0]?.name || item.color || item.shade || "";
}

function getMatchPhoto(item, wardrobeMatches) {
  if (!item || !wardrobeMatches) return null;
  const name = getItemName(item);
  const matches = wardrobeMatches[name] || [];
  for (const m of matches) {
    if (m?.thumbnailUrl || m?.photoUrl) return m.thumbnailUrl || m.photoUrl;
  }
  return null;
}

function getMatchNobgUrl(item, wardrobeMatches) {
  if (!item || !wardrobeMatches) return null;
  const name = getItemName(item);
  const matches = wardrobeMatches[name] || [];
  for (const m of matches) {
    if (m?.nobgUrl) return m.nobgUrl;
  }
  return null;
}

function getProductRec(item, productRecommendations) {
  if (!item || !productRecommendations) return null;
  const name = getItemName(item);
  const recs = productRecommendations[name] || [];
  return recs[0] || null;
}

function OutfitFlatLay({
  top,
  bottom,
  layer,
  footwear,
  flatlayUrl,
  size = "md",
  showOverlay = false,
  wardrobeMatches = {},
  productRecommendations = {},
}) {
  const colors = useSubscriptionColors();
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  // ──── Mode 1: Python-generated flat-lay image ────────────────────────────
  if (flatlayUrl) {
    return (
      <div
        className={`${s.container} rounded-xl overflow-hidden`}
        style={{ backgroundColor: "#f5f5f0" }}
      >
        <img
          src={flatlayUrl}
          alt="Outfit flat-lay"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // ──── Build all slots with best available image ───────────────────────────
  const allSlots = [
    { key: "top", item: top },
    { key: "bottom", item: bottom },
    { key: "layer", item: layer },
    { key: "footwear", item: footwear },
  ]
    .filter(({ item }) => item)
    .map(({ key, item }) => ({
      key,
      item,
      nobgUrl: item?.nobgUrl || getMatchNobgUrl(item, wardrobeMatches),
      photoUrl: item?.thumbnailUrl || item?.photoUrl || getMatchPhoto(item, wardrobeMatches),
    }));

  const hasAnyImage = allSlots.some(({ nobgUrl, photoUrl }) => nobgUrl || photoUrl);

  // ──── Mode 2: CSS flat-lay (md/lg, at least 1 item has an image) ─────────
  if (hasAnyImage && size !== "sm") {
    return (
      <div
        className={`${s.container} rounded-xl overflow-hidden relative`}
        style={{ backgroundColor: "#f5f5f0" }}
      >
        {allSlots.map(({ key, item, nobgUrl, photoUrl }) => {
          const pos = FLATLAY_SLOTS[key];

          if (nobgUrl) {
            return (
              <img
                key={key}
                src={nobgUrl}
                alt={getItemName(item) || key}
                className="absolute object-contain"
                style={{
                  ...pos,
                  filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.15))",
                }}
                loading="lazy"
              />
            );
          }

          if (photoUrl) {
            return (
              <div
                key={key}
                className="absolute rounded-lg overflow-hidden shadow-md"
                style={{ ...pos, border: "2px solid rgba(255,255,255,0.6)" }}
              >
                <img
                  src={photoUrl}
                  alt={getItemName(item) || key}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            );
          }

          // No image — styled placeholder in the slot
          return (
            <div
              key={key}
              className="absolute flex flex-col items-center justify-center rounded-lg"
              style={{ ...pos, backgroundColor: "#e8e8e4" }}
            >
              <span className={size === "lg" ? "text-2xl" : "text-lg"}>{CELL_EMOJI[key]}</span>
              <span className="text-[8px] text-gray-500 text-center px-1 truncate max-w-full">
                {getItemName(item) || CELL_LABELS[key]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ──── Mode 3: 2x2 grid fallback ──────────────────────────────────────────
  const cells = [
    { key: "top", item: top },
    { key: "layer", item: layer },
    { key: "bottom", item: bottom },
    { key: "footwear", item: footwear },
  ];

  return (
    <div className={`${s.container} grid grid-cols-2 grid-rows-2 gap-[2px] rounded-xl overflow-hidden`}>
      {cells.map(({ key, item }) => {
        const ownPhoto = item?.nobgUrl || item?.thumbnailUrl || item?.photoUrl || null;
        const photo = ownPhoto || getMatchPhoto(item, wardrobeMatches);
        const productRec = getProductRec(item, productRecommendations);
        const ownedList = item ? (wardrobeMatches[getItemName(item)] || []) : [];
        const isOwned = ownedList.length > 0;

        return (
          <div
            key={key}
            className="relative flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
          >
            {photo ? (
              <img src={photo} alt={getItemName(item)} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className={s.emoji}>{CELL_EMOJI[key]}</span>
                {size !== "sm" && item && (
                  <span className={`${s.text} dark:text-dark-text/50 text-light-text/50 text-center px-1 truncate max-w-full`}>
                    {getItemName(item) || CELL_LABELS[key]}
                  </span>
                )}
              </div>
            )}

            {(showOverlay || s.overlay) && item && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3">
                <p className={`${s.text} text-white font-medium truncate`}>
                  {getItemName(item)}
                </p>
                {getItemColor(item) && (
                  <p className={`${s.text} text-white/70 truncate`}>
                    {getItemColor(item)}
                  </p>
                )}
              </div>
            )}

            {s.badge && item && (
              <div className="absolute top-1 right-1">
                {isOwned ? (
                  <WardrobeMatchBadge type="owned" />
                ) : productRec ? (
                  <WardrobeMatchBadge type="shop" price={productRec.price} brand={productRec.brand} />
                ) : null}
              </div>
            )}

            {!item && size === "sm" && (
              <span className="text-[6px] dark:text-dark-text/30 text-light-text/30">
                {CELL_LABELS[key][0]}
              </span>
            )}
            {!item && size !== "sm" && (
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className={s.emoji + " opacity-30"}>{CELL_EMOJI[key]}</span>
                <span className={`${s.text} dark:text-dark-text/30 text-light-text/30`}>
                  {CELL_LABELS[key]}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OutfitFlatLay;
