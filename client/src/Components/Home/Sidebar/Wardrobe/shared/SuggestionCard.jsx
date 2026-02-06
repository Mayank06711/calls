import React from "react";
import { Visibility } from "@mui/icons-material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import WardrobeMatchBadge from "./WardrobeMatchBadge";
import { ColorDots } from "./ColorDots";

function SuggestionCard({ item, wardrobeMatches = {}, productRecommendations = {}, onExpand, fillParent = false }) {
  const colors = useSubscriptionColors();

  if (!item) return null;

  const itemName = item.name || item.subcategory || item.item || "Item";
  const itemColor = item.color || item.shade || "";
  const itemVibe = item.vibe || "";
  const itemNote = item.note || item.reason || "";
  const itemPattern = item.pattern || "";

  const ownedList = wardrobeMatches[itemName] || [];
  const ownedMatch = ownedList.length > 0 ? ownedList[0] : null;

  const productList = productRecommendations[itemName] || [];
  const productRec = productList.length > 0 ? productList[0] : null;

  const hasPhoto = ownedMatch?.photoUrl || ownedMatch?.thumbnailUrl;

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border transition-all hover:shadow-md ${fillParent ? "w-full" : "flex-shrink-0 w-36"}`}
      style={{ borderColor: `${colors.fourth}30` }}
    >
      {/* Image area */}
      <div className="relative w-full h-32">
        {hasPhoto ? (
          <img
            src={ownedMatch.thumbnailUrl || ownedMatch.photoUrl}
            alt={itemName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: `${colors.fourth}08` }}
          >
            <span className="text-2xl">
              {itemName.toLowerCase().includes("shirt") || itemName.toLowerCase().includes("top") || itemName.toLowerCase().includes("kurta") || itemName.toLowerCase().includes("tee")
                ? "👕"
                : itemName.toLowerCase().includes("jean") || itemName.toLowerCase().includes("trouser") || itemName.toLowerCase().includes("pant") || itemName.toLowerCase().includes("chino") || itemName.toLowerCase().includes("short")
                ? "👖"
                : itemName.toLowerCase().includes("jacket") || itemName.toLowerCase().includes("blazer") || itemName.toLowerCase().includes("coat") || itemName.toLowerCase().includes("layer")
                ? "🧥"
                : itemName.toLowerCase().includes("shoe") || itemName.toLowerCase().includes("sneaker") || itemName.toLowerCase().includes("boot") || itemName.toLowerCase().includes("loafer") || itemName.toLowerCase().includes("heel") || itemName.toLowerCase().includes("sandal") || itemName.toLowerCase().includes("footwear")
                ? "👟"
                : "👔"}
            </span>
            {itemColor && (
              <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">{itemColor}</span>
            )}
          </div>
        )}

        {/* Overlay badge */}
        <div className="absolute top-1.5 right-1.5">
          {ownedMatch ? (
            <WardrobeMatchBadge type="owned" />
          ) : productRec ? (
            <WardrobeMatchBadge type="shop" price={productRec.price} brand={productRec.brand} />
          ) : null}
        </div>

        {/* Eye button for expand — visible on hover */}
        {hasPhoto && onExpand && (
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(item, ownedMatch); }}
            className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: `${colors.fourth}cc` }}
            title="View larger"
          >
            <Visibility style={{ fontSize: 14 }} />
          </button>
        )}

        {/* Vibe tag */}
        {itemVibe && (
          <span
            className="absolute bottom-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: `${colors.fourth}cc` }}
          >
            {itemVibe}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 dark:bg-dark-primary bg-light-secondary">
        <p className="text-xs font-semibold dark:text-dark-text/90 text-light-text/90 truncate">
          {itemName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
          <ColorDots colors={ownedMatch?.dominantColors} max={2} size="sm" />
          {(itemColor || ownedMatch?.dominantColors?.[0]?.name) && (
            <span className="text-[10px] dark:text-dark-text/50 text-light-text/50 truncate">
              {ownedMatch?.dominantColors?.[0]?.name || itemColor}
            </span>
          )}
          {itemPattern && (
            <span className="text-[10px] dark:text-dark-text/40 text-light-text/40 flex-shrink-0">
              {itemPattern}
            </span>
          )}
        </div>
        {itemNote && (
          <p className="text-[9px] dark:text-dark-text/40 text-light-text/40 mt-1 line-clamp-2 leading-relaxed">
            {itemNote}
          </p>
        )}
      </div>
    </div>
  );
}

export default SuggestionCard;
