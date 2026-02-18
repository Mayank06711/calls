import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Close, Visibility, Image } from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";


function SlotBox({ slot, allItemsOfType, onUpdate, onRemoveSlot, isCustom, showNobg = true }) {
  const colors = useSubscriptionColors();
  const [dragOver, setDragOver] = useState(false);
  // Per-item nobg override — syncs with global toggle, but can be flipped individually
  const [itemNobg, setItemNobg] = useState(showNobg);

  // Sync per-item state when global toggle changes
  useEffect(() => {
    setItemNobg(showNobg);
  }, [showNobg]);

  const item = slot.item;
  const total = allItemsOfType.length;
  const currentIdx = item ? allItemsOfType.findIndex((i) => i._id === item._id) : -1;

  const handleNext = (e) => {
    e.stopPropagation();
    if (total === 0) return;
    if (!item) {
      onUpdate(allItemsOfType[0]);
    } else {
      onUpdate(allItemsOfType[(currentIdx + 1) % total]);
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (total === 0) return;
    if (!item) {
      onUpdate(allItemsOfType[total - 1]);
    } else {
      onUpdate(allItemsOfType[(currentIdx - 1 + total) % total]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onUpdate(null);
  };

  // HTML5 DnD handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data?.item) onUpdate(data.item);
    } catch { /* ignore invalid drops */ }
  };

  // Respect per-item nobg toggle for image display
  const hasNobg = !!item?.nobgUrl;
  const isNobg = itemNobg && hasNobg;
  const photoUrl = isNobg
    ? item.nobgUrl
    : (item?.thumbnailUrl || item?.photoUrl);

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all ${
        dragOver ? "scale-[1.02] ring-2" : ""
      } ${item ? "dark:bg-dark-primary bg-light-secondary" : "dark:bg-dark-primary/50 bg-light-secondary/50"}`}
      style={{
        borderColor: dragOver ? colors.fourth : toRgba(colors.fourth, 0.25),
        ringColor: colors.fourth,
        height: 220,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Slot label badge */}
      <div
        className="absolute top-2 left-2 z-10 text-[9px] font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: toRgba(colors.fourth, 0.2), color: colors.fourth }}
      >
        {slot.label}
      </div>

      {/* Remove custom slot button */}
      {isCustom && !item && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveSlot?.(); }}
          className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full flex items-center justify-center bg-red-500/80 text-white hover:bg-red-600 transition-colors"
        >
          <Close style={{ fontSize: 10 }} />
        </button>
      )}

      {item ? (
        /* ── Filled State ── */
        <div className="flex flex-col h-full">
          {/* Photo area — nobg: clean white bg for clear item display */}
          <div className="relative flex-1 min-h-0 overflow-hidden" style={isNobg ? { backgroundColor: "#f8f8f5" } : undefined}>
            {photoUrl ? (
              <>
                {/* Blurred bg fill — only for regular photos, not nobg */}
                {!isNobg && (
                  <img
                    src={photoUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
                  />
                )}
                {/* Actual image */}
                <img
                  src={photoUrl}
                  alt={item.subcategory}
                  className="relative w-full h-full object-contain z-[1]"
                />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
                {slot.emoji}
              </div>
            )}
            {/* Clear button */}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Close style={{ fontSize: 14 }} />
            </button>
            {/* Per-item nobg/photo toggle */}
            {hasNobg && (
              <button
                onClick={(e) => { e.stopPropagation(); setItemNobg((p) => !p); }}
                className={`absolute bottom-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isNobg ? "bg-amber-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
                }`}
                title={isNobg ? "Show original photo" : "Show no-background"}
              >
                {isNobg ? (
                  <Image style={{ fontSize: 13 }} />
                ) : (
                  <Visibility style={{ fontSize: 13 }} />
                )}
              </button>
            )}
          </div>

          {/* Details */}
          <div className="px-3 py-2">
            <p className="text-xs font-semibold dark:text-dark-text/90 text-light-text/90 truncate">
              {item.subcategory || item.type}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {item.color && (
                <span className="text-[10px] dark:text-dark-text/50 text-light-text/50">{item.color}</span>
              )}
              {item.color && item.brand && (
                <span className="text-[10px] dark:text-dark-text/30 text-light-text/30">·</span>
              )}
              {item.brand && (
                <span className="text-[10px] dark:text-dark-text/50 text-light-text/50">{item.brand}</span>
              )}
            </div>
            {(item.fabric || item.pattern) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {item.fabric && (
                  <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">{item.fabric}</span>
                )}
                {item.fabric && item.pattern && (
                  <span className="text-[9px] dark:text-dark-text/25 text-light-text/25">·</span>
                )}
                {item.pattern && (
                  <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">{item.pattern}</span>
                )}
              </div>
            )}
          </div>

          {/* Cycling nav */}
          {total > 1 && (
            <div className="flex items-center justify-between px-2 pb-2">
              <button
                onClick={handlePrev}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
              >
                <ChevronLeft style={{ fontSize: 16 }} className="dark:text-dark-text/50 text-light-text/50" />
              </button>
              <span className="text-[9px] dark:text-dark-text/40 text-light-text/40 font-mono">
                {currentIdx + 1} / {total}
              </span>
              <button
                onClick={handleNext}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
              >
                <ChevronRight style={{ fontSize: 16 }} className="dark:text-dark-text/50 text-light-text/50" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Empty State ── */
        <div className="flex flex-col items-center justify-center h-full min-h-[180px] gap-2 px-4">
          <span className="text-3xl opacity-20">{slot.emoji}</span>
          <p className="text-[10px] dark:text-dark-text/30 text-light-text/30 text-center">
            {total > 0 ? "Tap item or use arrows" : `No ${slot.label.toLowerCase()} items in closet`}
          </p>

          {/* Cycling nav even in empty state */}
          {total > 0 && (
            <div className="flex items-center gap-4 mt-1">
              <button
                onClick={handlePrev}
                className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors"
                style={{ borderColor: toRgba(colors.fourth, 0.3) }}
              >
                <ChevronLeft style={{ fontSize: 16 }} className="dark:text-dark-text/40 text-light-text/40" />
              </button>
              <button
                onClick={handleNext}
                className="w-7 h-7 rounded-full flex items-center justify-center border transition-colors"
                style={{ borderColor: toRgba(colors.fourth, 0.3) }}
              >
                <ChevronRight style={{ fontSize: 16 }} className="dark:text-dark-text/40 text-light-text/40" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drag-over overlay */}
      {dragOver && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
        >
          <span className="text-xs font-medium" style={{ color: colors.fourth }}>
            Drop here
          </span>
        </div>
      )}
    </div>
  );
}

export default SlotBox;
