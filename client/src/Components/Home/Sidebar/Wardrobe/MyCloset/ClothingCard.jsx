import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DeleteOutline, FolderOutlined, Check } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { deleteClothThunk, addItemsToCollectionThunk, removeItemsFromCollectionThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { ColorDots } from "../shared/ColorDots";

function ClothingCard({ item, onOpenLightbox, showNobgGlobal = false, selectionMode = false, isSelected = false, onToggleSelect }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const deletingId = useSelector((state) => state.wardrobe.closet.deleting);
  const collections = useSelector((state) => state.wardrobe.collections.list);
  const [showActions, setShowActions] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);

  const isDeleting = deletingId === item._id;
  const hasNobg = !!item.nobgUrl;
  const isProcessing = item.processingStatus === "processing";

  const handleDelete = (e) => {
    e.stopPropagation();
    dispatch(deleteClothThunk(item._id));
  };

  const handleToggleCollection = (e, col) => {
    e.stopPropagation();
    const itemIds = col.itemIds.map((id) => (typeof id === "object" ? id._id : id));
    if (itemIds.includes(item._id)) {
      dispatch(removeItemsFromCollectionThunk(col._id, [item._id]));
    } else {
      dispatch(addItemsToCollectionThunk(col._id, [item._id]));
    }
  };

  const toggleNotes = (e) => {
    e.stopPropagation();
    setNotesExpanded((p) => !p);
  };

  const originalUrl = item.thumbnailUrl || item.photoUrl;
  const displayUrl = showNobgGlobal && hasNobg ? item.nobgUrl : originalUrl;
  const fullUrl = item.photoUrl;
  const hasNotes = item.notes && item.notes.trim().length > 0;

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(item._id);
      return;
    }
    if (fullUrl && onOpenLightbox) {
      onOpenLightbox(item);
    }
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all cursor-pointer ${
        selectionMode && isSelected ? "ring-2 shadow-lg" : "hover:shadow-lg"
      }`}
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.25)}`,
        '--tw-ring-color': colors.fourth,
      }}
      onMouseEnter={() => !selectionMode && setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowCollectionMenu(false); }}
      onClick={handleClick}
    >
      {/* Photo - fixed height, image contained and centered */}
      {displayUrl ? (
        <div
          className="w-full h-52 flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: showNobgGlobal && hasNobg ? "#f5f5f5" : "#f8f8f8",
            ...(showNobgGlobal && hasNobg
              ? {
                  backgroundImage:
                    "linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }
              : {}),
          }}
        >
          <img
            src={displayUrl}
            alt={item.subcategory}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      ) : (
        <div
          className="w-full h-52 flex items-center justify-center text-3xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        >
          {item.type === "Top" && "👕"}
          {item.type === "Bottom" && "👖"}
          {item.type === "Outerwear" && "🧥"}
          {item.type === "Shoes" && "👟"}
          {item.type === "Accessory" && "⌚"}
        </div>
      )}

      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected ? "border-transparent" : "bg-white/80 border-gray-400"
            }`}
            style={isSelected ? { backgroundColor: colors.fourth, borderColor: colors.fourth } : undefined}
          >
            {isSelected && <Check style={{ fontSize: 14, color: "white" }} />}
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-[10px]">
          <CircularProgress size={10} style={{ color: "white" }} />
          <span>Processing...</span>
        </div>
      )}

      {/* Glass overlay at bottom of image */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)",
        }}
      >
        <p className="text-xs font-semibold text-white truncate">
          {item.subcategory}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden">
          <ColorDots colors={item.dominantColors} max={3} size="sm" />
          {(item.dominantColors?.[0]?.name || item.color) && (
            <span className="text-[10px] text-white/70 truncate">
              {item.dominantColors?.[0]?.name || item.color}
            </span>
          )}
          {item.brand && (
            <span className="text-[10px] text-white/50 flex-shrink-0">{item.brand}</span>
          )}
        </div>
        {hasNotes && (
          <p
            className={`text-[10px] text-white/50 mt-1 leading-relaxed cursor-text ${
              notesExpanded ? "" : "line-clamp-1"
            }`}
            onClick={toggleNotes}
          >
            {item.notes}
          </p>
        )}
      </div>

      {/* Action buttons on hover (hidden in selection mode) */}
      {showActions && !selectionMode && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {/* Collection button */}
          {collections.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCollectionMenu((p) => !p); }}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 text-white transition-all"
              >
                <FolderOutlined style={{ fontSize: 14 }} />
              </button>

              {/* Collection dropdown */}
              {showCollectionMenu && (
                <div
                  className="absolute top-full right-0 mt-1 z-30 rounded-lg shadow-lg border dark:bg-dark-primary bg-light-secondary py-1 min-w-[140px]"
                  style={{ borderColor: toRgba(colors.fourth, 0.2) }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {collections.map((col) => {
                    const colItemIds = col.itemIds.map((id) => (typeof id === "object" ? id._id : id));
                    const isIn = colItemIds.includes(item._id);
                    return (
                      <button
                        key={col._id}
                        onClick={(e) => handleToggleCollection(e, col)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs dark:text-dark-text text-light-text hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <span className="text-sm">{col.emoji || "📁"}</span>
                        <span className="flex-1 text-left truncate">{col.name}</span>
                        {isIn && <Check style={{ fontSize: 14, color: colors.fourth }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-600 text-white transition-all"
          >
            {isDeleting ? (
              <CircularProgress size={12} style={{ color: "white" }} />
            ) : (
              <DeleteOutline style={{ fontSize: 14 }} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ClothingCard;
