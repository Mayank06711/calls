import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { FavoriteBorder, Favorite, DeleteOutline } from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { toggleOutfitFavoriteThunk, deleteOutfitThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";

function OutfitListItem({ outfit, onClick }) {
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

  // Build summary text from items
  const itemNames = items
    .map((i) => resolveItem(i))
    .filter(Boolean)
    .map((i) => i.subcategory || i.type)
    .join(" + ");

  return (
    <div
      className="flex items-center gap-3 rounded-xl border p-2.5 transition-all hover:shadow-md cursor-pointer dark:bg-dark-primary bg-light-secondary"
      style={{ borderColor: toRgba(colors.fourth, 0.2) }}
      onClick={() => onClick?.(outfit)}
    >
      {/* Mini flat-lay */}
      <div className="flex-shrink-0">
        <OutfitFlatLay
          top={resolveItem(topItem)}
          bottom={resolveItem(bottomItem)}
          layer={resolveItem(layerItem)}
          footwear={resolveItem(footwearItem)}
          flatlayUrl={outfit.flatlayUrl}
          size="sm"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold dark:text-dark-text/90 text-light-text/90 truncate">
          {outfit.name || "Untitled"}
        </p>
        <p className="text-[9px] dark:text-dark-text/50 text-light-text/50 truncate mt-0.5">
          {itemNames || "No items"}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {outfit.occasion && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
              {outfit.occasion}
            </span>
          )}
          {outfit.season && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/60 text-light-text/60">
              {outfit.season}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); dispatch(toggleOutfitFavoriteThunk(outfit._id)); }}
          disabled={togglingFavorite === outfit._id}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-secondary"
        >
          {outfit.isFavorite ? (
            <Favorite style={{ fontSize: 14, color: "#ef4444" }} />
          ) : (
            <FavoriteBorder style={{ fontSize: 14 }} className="dark:text-dark-text/40 text-light-text/40" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); dispatch(deleteOutfitThunk(outfit._id)); }}
          className="p-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/20"
        >
          <DeleteOutline style={{ fontSize: 14 }} className="dark:text-dark-text/40 text-light-text/40" />
        </button>
      </div>
    </div>
  );
}

export default OutfitListItem;
