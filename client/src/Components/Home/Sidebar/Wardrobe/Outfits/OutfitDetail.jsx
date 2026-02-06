import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowBack, Favorite, FavoriteBorder, DeleteOutline, CalendarMonth, Edit } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import {
  fetchOutfitsThunk,
  toggleOutfitFavoriteThunk,
  deleteOutfitThunk,
  logWearThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import OutfitItemRow from "./OutfitItemRow";
import { ColorPaletteDetail } from "../shared/ColorDots";

function OutfitDetail() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { outfitId } = useParams();

  const { saved, loading } = useSelector((s) => s.wardrobe.outfits);
  const { logging } = useSelector((s) => s.wardrobe.wearLog);
  const [loggingWear, setLoggingWear] = useState(false);

  useEffect(() => {
    if (saved.length === 0) dispatch(fetchOutfitsThunk());
  }, [dispatch, saved.length]);

  const outfit = saved.find((o) => o._id === outfitId);

  if (loading && !outfit) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress size={24} style={{ color: colors.fourth }} />
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="p-4 text-center">
        <p className="dark:text-dark-text/50 text-light-text/50">Outfit not found</p>
        <button onClick={() => navigate("/wardrobe/outfits")} className="mt-2 text-sm underline" style={{ color: colors.fourth }}>
          Back to outfits
        </button>
      </div>
    );
  }

  const items = outfit.items || [];
  const topItem = items.find((i) => (i.clothingItem?.type || i.type) === "Top");
  const bottomItem = items.find((i) => (i.clothingItem?.type || i.type) === "Bottom");
  const layerItem = items.find((i) => (i.clothingItem?.type || i.type) === "Outerwear");
  const footwearItem = items.find((i) => (i.clothingItem?.type || i.type) === "Shoes");
  const resolveItem = (i) => i?.clothingItem || i;

  const handleLogWear = async () => {
    setLoggingWear(true);
    await dispatch(logWearThunk({ outfitId: outfit._id, wornAt: new Date().toISOString(), occasion: outfit.occasion }));
    setLoggingWear(false);
  };

  const handleDelete = async () => {
    await dispatch(deleteOutfitThunk(outfit._id));
    navigate("/wardrobe/outfits");
  };

  return (
    <div className="p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate("/wardrobe/outfits")} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text truncate">
            {outfit.name || "Untitled Outfit"}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <IconButton onClick={() => dispatch(toggleOutfitFavoriteThunk(outfit._id))} size="small">
            {outfit.isFavorite ? (
              <Favorite style={{ color: "#ef4444", fontSize: 20 }} />
            ) : (
              <FavoriteBorder style={{ fontSize: 20 }} className="dark:text-dark-text/40 text-light-text/40" />
            )}
          </IconButton>
          <IconButton onClick={handleDelete} size="small">
            <DeleteOutline style={{ fontSize: 20 }} className="dark:text-dark-text/40 text-light-text/40" />
          </IconButton>
        </div>
      </div>

      {/* Quick preview + metadata row */}
      <div
        className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-3 mb-4 flex items-start gap-3"
        style={{ borderColor: `${colors.fourth}30` }}
      >
        <OutfitFlatLay
          top={resolveItem(topItem)}
          bottom={resolveItem(bottomItem)}
          layer={resolveItem(layerItem)}
          footwear={resolveItem(footwearItem)}
          flatlayUrl={outfit.flatlayUrl}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 text-sm">
            {outfit.occasion && (
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.fourth}15`, color: colors.fourth }}>
                {outfit.occasion}
              </span>
            )}
            {outfit.season && (
              <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${colors.fourth}10`, color: colors.fourth }}>
                {outfit.season}
              </span>
            )}
            {outfit.source && (
              <span className="text-[9px] px-2 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/50 text-light-text/50">
                {outfit.source === "ai" ? "AI" : outfit.source === "builder-slots" ? "Slots" : "Builder"}
              </span>
            )}
          </div>
          {outfit.createdAt && (
            <p className="text-[9px] dark:text-dark-text/40 text-light-text/40 mt-1">
              Created {new Date(outfit.createdAt).toLocaleDateString()}
            </p>
          )}
          {outfit.tags?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {outfit.tags.map((tag, i) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/50 text-light-text/50">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {outfit.notes && (
            <p className="mt-1.5 text-[10px] dark:text-dark-text/50 text-light-text/50 leading-relaxed line-clamp-2">
              {outfit.notes}
            </p>
          )}
          {outfit.colorPalette?.length > 0 && (
            <div className="mt-2">
              <p className="text-[8px] font-medium dark:text-dark-text/40 text-light-text/40 mb-1">Colors</p>
              <ColorPaletteDetail palette={outfit.colorPalette} />
            </div>
          )}
        </div>
      </div>

      {/* Individual item cards — vertical stack */}
      <div className="space-y-2 mb-4">
        {[
          { item: topItem, type: "Top" },
          { item: bottomItem, type: "Bottom" },
          { item: layerItem, type: "Layer" },
          { item: footwearItem, type: "Shoes" },
        ]
          .filter(({ item }) => item)
          .map(({ item, type }) => (
            <OutfitItemRow key={type} item={resolveItem(item)} type={type} />
          ))}
        {/* Accessories (any items not in the 4 main types) */}
        {items
          .filter((i) => {
            const t = i.clothingItem?.type || i.type;
            return t === "Accessory";
          })
          .map((i, idx) => (
            <OutfitItemRow key={`acc-${idx}`} item={resolveItem(i)} type="Accessory" />
          ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleLogWear}
          disabled={loggingWear || logging}
          className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: colors.fourth }}
        >
          {(loggingWear || logging) ? <CircularProgress size={14} style={{ color: "white" }} /> : <CalendarMonth style={{ fontSize: 16 }} />}
          Log as Worn
        </button>
        <button
          onClick={() => navigate("/wardrobe/outfit-builder")}
          className="px-4 py-2.5 rounded-lg text-sm font-medium border flex items-center gap-2 dark:text-dark-text/70 text-light-text/70"
          style={{ borderColor: `${colors.fourth}30` }}
        >
          <Edit style={{ fontSize: 16 }} />
          Edit
        </button>
      </div>
    </div>
  );
}

export default OutfitDetail;
