import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { FavoriteBorder, Favorite, CalendarMonth, DeleteOutline } from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { toggleOutfitFavoriteThunk, deleteOutfitThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import { ColorPaletteBar } from "../shared/ColorDots";

function OutfitCard({ outfit, onClick }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const { togglingFavorite } = useSelector((s) => s.wardrobe.outfits);

  if (!outfit) return null;

  const items = outfit.items || [];
  const topItem = items.find((i) => i.type === "Top" || i.clothingItem?.type === "Top");
  const bottomItem = items.find((i) => i.type === "Bottom" || i.clothingItem?.type === "Bottom");
  const layerItem = items.find((i) => i.type === "Outerwear" || i.clothingItem?.type === "Outerwear");
  const footwearItem = items.find((i) => i.type === "Shoes" || i.clothingItem?.type === "Shoes");

  const resolveItem = (i) => i?.clothingItem || i;

  return (
    <div
      className="group rounded-xl border overflow-hidden transition-all hover:shadow-md cursor-pointer dark:bg-dark-primary bg-light-secondary"
      style={{ borderColor: toRgba(colors.fourth, 0.2) }}
      onClick={() => onClick?.(outfit)}
    >
      {/* Flat-lay thumbnail */}
      <div className="p-2">
        <OutfitFlatLay
          top={resolveItem(topItem)}
          bottom={resolveItem(bottomItem)}
          layer={resolveItem(layerItem)}
          footwear={resolveItem(footwearItem)}
          flatlayUrl={outfit.flatlayUrl}
          size="md"
        />
      </div>

      {/* Color palette bar */}
      {outfit.colorPalette?.length > 0 && (
        <div className="px-2 pb-1">
          <ColorPaletteBar palette={outfit.colorPalette} />
        </div>
      )}

      {/* Info */}
      <div className="px-3 pb-3">
        <p className="text-xs font-semibold dark:text-dark-text/90 text-light-text/90 truncate">
          {outfit.name || "Untitled"}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {outfit.occasion && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
              {outfit.occasion}
            </span>
          )}
          {outfit.season && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
              {outfit.season}
            </span>
          )}
          {items.length > 0 && (
            <span className="text-[8px] dark:text-dark-text/40 text-light-text/40 ml-auto">
              {items.length} items
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(toggleOutfitFavoriteThunk(outfit._id)); }}
            disabled={togglingFavorite === outfit._id}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary"
          >
            {outfit.isFavorite ? (
              <Favorite style={{ fontSize: 16, color: "#ef4444" }} />
            ) : (
              <FavoriteBorder style={{ fontSize: 16 }} className="dark:text-dark-text/40 text-light-text/40" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(deleteOutfitThunk(outfit._id)); }}
            className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20"
          >
            <DeleteOutline style={{ fontSize: 16 }} className="dark:text-dark-text/40 text-light-text/40" />
          </button>
          {outfit.source === "ai" && (
            <span className="text-[8px] ml-auto dark:text-dark-text/30 text-light-text/30">AI</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default OutfitCard;
