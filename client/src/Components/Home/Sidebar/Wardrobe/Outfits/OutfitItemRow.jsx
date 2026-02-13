import React from "react";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { ColorDots } from "../shared/ColorDots";

const TYPE_EMOJI = {
  Top: "👕",
  Bottom: "👖",
  Outerwear: "🧥",
  Shoes: "👟",
  Accessory: "⌚",
};

function OutfitItemRow({ item, type }) {
  const colors = useSubscriptionColors();
  if (!item) return null;

  const photoUrl = item.thumbnailUrl || item.photoUrl;
  const displayType = type || item.type || "Item";

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-2.5 transition-all"
      style={{ borderColor: toRgba(colors.fourth, 0.2) }}
    >
      {/* Photo */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        {photoUrl ? (
          <img src={photoUrl} alt={item.subcategory} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
          >
            {TYPE_EMOJI[item.type] || "👔"}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: toRgba(colors.fourth, 0.15), color: colors.fourth }}
          >
            {displayType}
          </span>
        </div>
        <p className="text-sm font-medium dark:text-dark-text/90 text-light-text/90 truncate mt-0.5">
          {item.subcategory || item.name || item.item || "Unknown"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <ColorDots colors={item.dominantColors} max={3} size="sm" />
          {(item.dominantColors?.[0]?.name || item.color) && (
            <span className="text-[10px] dark:text-dark-text/50 text-light-text/50 truncate">
              {item.dominantColors?.[0]?.name || item.color}
            </span>
          )}
          {(item.dominantColors?.[0]?.name || item.color) && item.brand && (
            <span className="text-[10px] dark:text-dark-text/30 text-light-text/30 flex-shrink-0">·</span>
          )}
          {item.brand && (
            <span className="text-[10px] dark:text-dark-text/50 text-light-text/50 truncate">{item.brand}</span>
          )}
        </div>
        {(item.fabric || item.pattern) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.fabric && (
              <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">{item.fabric}</span>
            )}
            {item.fabric && item.pattern && item.pattern !== "Solid" && (
              <span className="text-[9px] dark:text-dark-text/25 text-light-text/25">·</span>
            )}
            {item.pattern && item.pattern !== "Solid" && (
              <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">{item.pattern}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OutfitItemRow;
