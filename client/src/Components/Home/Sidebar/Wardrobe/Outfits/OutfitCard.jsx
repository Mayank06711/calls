import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FavoriteBorder, Favorite, DeleteOutline, IosShare } from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { toggleOutfitFavoriteThunk, deleteOutfitThunk, shareOutfitThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";

function OutfitCard({ outfit, onClick, onShare, isFromOther }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const { togglingFavorite } = useSelector((s) => s.wardrobe.outfits);
  const [showActions, setShowActions] = useState(false);

  if (!outfit) return null;

  const items = outfit.items || [];
  const topItem = items.find((i) => i.type === "Top" || i.clothingItem?.type === "Top");
  const bottomItem = items.find((i) => i.type === "Bottom" || i.clothingItem?.type === "Bottom");
  const layerItem = items.find((i) => i.type === "Outerwear" || i.clothingItem?.type === "Outerwear");
  const footwearItem = items.find((i) => i.type === "Shoes" || i.clothingItem?.type === "Shoes");
  const resolveItem = (i) => i?.clothingItem || i;

  const palette = outfit.colorPalette || [];

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all hover:shadow-lg cursor-pointer"
      style={{ border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onClick?.(outfit)}
    >
      {/* Flatlay image area — fills the card */}
      <div className="w-full aspect-[4/5] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#f5f5f0" }}
      >
        {outfit.flatlayUrl ? (
          <img
            src={outfit.flatlayUrl}
            alt={outfit.name || "Outfit"}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <OutfitFlatLay
              top={resolveItem(topItem)}
              bottom={resolveItem(bottomItem)}
              layer={resolveItem(layerItem)}
              footwear={resolveItem(footwearItem)}
              size="lg"
            />
          </div>
        )}
      </div>

      {/* Color palette strip */}
      {palette.length > 0 && (
        <div className="absolute left-0 right-0 flex overflow-hidden" style={{ bottom: 52, height: 8 }}>
          {palette.map((c, i) => (
            <div
              key={i}
              className={`flex-1 ${i === 0 ? "rounded-l-sm" : ""} ${i === palette.length - 1 ? "rounded-r-sm" : ""}`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      )}

      {/* Glass overlay at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)",
        }}
      >
        <p className="text-xs font-semibold text-white truncate">
          {outfit.name || "Untitled Outfit"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {outfit.occasion && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 backdrop-blur-sm">
              {outfit.occasion}
            </span>
          )}
          {outfit.season && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 backdrop-blur-sm">
              {outfit.season}
            </span>
          )}
          {items.length > 0 && (
            <span className="text-[8px] text-white/40 ml-auto">
              {items.length} items
            </span>
          )}
        </div>
      </div>

      {/* AI source badge */}
      {(outfit.source === "ai_suggested" || outfit.source === "engine_suggested" || outfit.source === "ai") && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-[8px] font-semibold text-white/80 tracking-wide">AI</span>
        </div>
      )}

      {/* Favorite indicator (always visible if favorited) */}
      {outfit.isFavorite && !showActions && (
        <div className="absolute top-2 right-2">
          <Favorite style={{ fontSize: 16, color: "#ef4444", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }} />
        </div>
      )}

      {/* Hover action buttons */}
      {showActions && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onShare?.(outfit); }}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-all"
          >
            <IosShare style={{ fontSize: 14 }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(toggleOutfitFavoriteThunk(outfit._id)); }}
            disabled={togglingFavorite === outfit._id}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-all"
          >
            {outfit.isFavorite ? (
              <Favorite style={{ fontSize: 14, color: "#ef4444" }} />
            ) : (
              <FavoriteBorder style={{ fontSize: 14 }} />
            )}
          </button>
          {!isFromOther && (
            <button
              onClick={(e) => { e.stopPropagation(); dispatch(deleteOutfitThunk(outfit._id)); }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-600 text-white transition-all"
            >
              <DeleteOutline style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default OutfitCard;
