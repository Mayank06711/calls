import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DeleteOutline } from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { deleteClothThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { ColorDots } from "../shared/ColorDots";

function ClothingCard({ item, onOpenLightbox, showNobgGlobal = false }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const deletingId = useSelector((state) => state.wardrobe.closet.deleting);
  const [showDelete, setShowDelete] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const isDeleting = deletingId === item._id;
  const hasNobg = !!item.nobgUrl;
  const isProcessing = item.processingStatus === "processing";

  const handleDelete = (e) => {
    e.stopPropagation();
    dispatch(deleteClothThunk(item._id));
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
    if (fullUrl && onOpenLightbox) {
      onOpenLightbox(item);
    }
  };

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all hover:shadow-lg cursor-pointer"
      style={{ border: `1px solid ${colors.fourth}25` }}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
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
          style={{ backgroundColor: `${colors.fourth}10` }}
        >
          {item.type === "Top" && "👕"}
          {item.type === "Bottom" && "👖"}
          {item.type === "Outerwear" && "🧥"}
          {item.type === "Shoes" && "👟"}
          {item.type === "Accessory" && "⌚"}
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

      {/* Delete button on hover */}
      {showDelete && (
        <div className="absolute top-1.5 right-1.5">
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
