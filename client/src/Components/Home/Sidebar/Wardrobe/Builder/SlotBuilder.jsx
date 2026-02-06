import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Checkroom, Close, Add, Visibility, ChevronLeft, ChevronRight, GridViewRounded, ViewCozy,
} from "@mui/icons-material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import {
  updateBuilderSlotItem,
  addBuilderSlot,
  removeBuilderSlot,
} from "../../../../../redux/actions/wardrobe.actions";
import SlotBox from "./SlotBox";
import ImageLightbox from "../MyCloset/ImageLightbox";

const TYPE_TABS = ["All", "Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const ACCESSORY_SUBTYPES = [
  { label: "Watch", emoji: "⌚" },
  { label: "Belt", emoji: "👔" },
  { label: "Sunglasses", emoji: "🕶️" },
  { label: "Bracelet", emoji: "📿" },
  { label: "Scarf", emoji: "🧣" },
  { label: "Tie", emoji: "👔" },
  { label: "Pocket Square", emoji: "🎩" },
  { label: "Cap", emoji: "🧢" },
];

function SlotBuilder({ closetItems, onOpenClosetDrawer }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const slots = useSelector((s) => s.wardrobe.builder.slots);

  const [closetOpen, setClosetOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedItem, setSelectedItem] = useState(null); // for mobile tap-to-place
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "flatlay"

  const filteredItems = typeFilter === "All"
    ? closetItems
    : closetItems.filter((i) => i.type === typeFilter);

  const getItemsForSlot = useCallback((slot) => {
    if (slot.subtype) {
      return closetItems.filter((i) => i.type === slot.type && i.subcategory === slot.subtype);
    }
    return closetItems.filter((i) => i.type === slot.type);
  }, [closetItems]);

  const handleSlotUpdate = useCallback((slotKey, item) => {
    dispatch(updateBuilderSlotItem(slotKey, item));
  }, [dispatch]);

  // When clicking a closet item: on mobile -> select for tap-to-place, on desktop -> auto-fill matching slot
  const handleClosetItemClick = useCallback((item) => {
    if (window.innerWidth < 640) {
      // Mobile: select item, then user taps a slot
      setSelectedItem(item);
      setClosetOpen(false);
      return;
    }
    // Desktop: auto-fill matching slot
    autoFillSlot(item);
  }, [slots, dispatch]);

  const autoFillSlot = (item) => {
    // Find a matching slot by type
    const matchingSlot = slots.find((s) => s.type === item.type && !s.item);
    if (matchingSlot) {
      dispatch(updateBuilderSlotItem(matchingSlot.key, item));
    } else {
      // If all matching slots are filled, replace the first matching slot
      const firstMatch = slots.find((s) => s.type === item.type);
      if (firstMatch) {
        dispatch(updateBuilderSlotItem(firstMatch.key, item));
      }
    }
  };

  // Mobile: when a slot is tapped with a selected item
  const handleSlotTapWithSelected = useCallback((slotKey) => {
    if (selectedItem) {
      dispatch(updateBuilderSlotItem(slotKey, selectedItem));
      setSelectedItem(null);
    }
  }, [selectedItem, dispatch]);

  const handleAddSlot = (subtype) => {
    const key = `acc_${subtype.label.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
    dispatch(addBuilderSlot({
      key,
      type: "Accessory",
      subtype: subtype.label,
      label: subtype.label,
      emoji: subtype.emoji,
      item: null,
    }));
    setShowAddSlot(false);
  };

  const handleRemoveSlot = (key) => {
    dispatch(removeBuilderSlot(key));
  };

  // DnD: make closet items draggable
  const handleDragStart = (e, item) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ item }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const defaultSlotKeys = ["top", "bottom", "layer", "footwear"];

  // Flat-lay positioning based on rule of thirds
  const getFlatlayPosition = (slotKey) => {
    const positions = {
      layer: { top: "8%", left: "10%", transform: "rotate(-8deg)", zIndex: 1, width: "42%" },
      top: { top: "15%", left: "50%", transform: "translateX(-50%)", zIndex: 2, width: "38%" },
      bottom: { top: "48%", left: "50%", transform: "translateX(-50%)", zIndex: 3, width: "36%" },
      footwear: { bottom: "8%", left: "50%", transform: "translateX(-50%)", zIndex: 4, width: "28%" },
    };

    // Accessories positioned around the outfit
    if (slotKey.startsWith("acc_")) {
      const accessories = slots.filter((s) => s.key.startsWith("acc_"));
      const idx = accessories.findIndex((s) => s.key === slotKey);
      const angle = (idx * 60) - 30; // Distribute around
      const radius = 42; // % from center
      const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
      const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
      return {
        top: `${Math.max(5, Math.min(80, y))}%`,
        left: `${Math.max(5, Math.min(85, x))}%`,
        transform: `translate(-50%, -50%) rotate(${(idx % 2 === 0 ? 5 : -5)}deg)`,
        zIndex: 5 + idx,
        width: "20%",
      };
    }

    return positions[slotKey] || { top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 0, width: "30%" };
  };

  return (
    <div className="relative w-full h-full flex flex-col sm:flex-row overflow-hidden pt-11">

      {/* ═══ Closet Panel (desktop: left sidebar, mobile: bottom drawer) ═══ */}

      {/* Desktop sidebar */}
      <div
        className={`hidden sm:flex flex-col flex-shrink-0 transition-all duration-300 ease-out border-r backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 ${
          closetOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
        style={{ borderColor: `${colors.fourth}20` }}
      >
        {closetOpen && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: `${colors.fourth}15` }}>
              <div className="flex items-center gap-2">
                <Checkroom style={{ color: colors.fourth, fontSize: 18 }} />
                <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">My Closet</h3>
                <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">({filteredItems.length})</span>
              </div>
              <button
                onClick={() => setClosetOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border shadow-sm dark:bg-dark-primary/60 bg-light-secondary/60 dark:text-dark-text/60 text-light-text/60"
                style={{ borderColor: `${colors.fourth}20` }}
              >
                <Close style={{ fontSize: 14 }} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b" style={{ borderColor: `${colors.fourth}10` }}>
              {TYPE_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                    typeFilter === t ? "text-white" : "dark:text-dark-text/60 text-light-text/60"
                  }`}
                  style={{
                    backgroundColor: typeFilter === t ? colors.fourth : "transparent",
                    border: typeFilter === t ? "none" : `1px solid ${colors.fourth}30`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="overflow-y-auto custom-scrollbar p-3 flex-1" style={{ overscrollBehavior: "contain" }}>
              <div className="grid grid-cols-2 gap-2">
                {filteredItems.map((item) => {
                  const imgSrc = item.thumbnailUrl || item.photoUrl;
                  const hasPhoto = imgSrc && imgSrc !== "placeholder";
                  return (
                    <div key={item._id} className="relative group">
                      <button
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onClick={() => handleClosetItemClick(item)}
                        className="w-full rounded-lg overflow-hidden border transition-all hover:shadow-md"
                        style={{ borderColor: `${colors.fourth}25` }}
                      >
                        {hasPhoto ? (
                          <img src={imgSrc} alt={item.subcategory} className="w-full h-24 object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-24 flex items-center justify-center text-2xl" style={{ backgroundColor: `${colors.fourth}08` }}>
                            {item.type === "Top" ? "👕" : item.type === "Bottom" ? "👖" : item.type === "Outerwear" ? "🧥" : item.type === "Shoes" ? "👟" : "⌚"}
                          </div>
                        )}
                        <p className="text-[10px] px-2 py-1.5 dark:text-dark-text/70 text-light-text/70 truncate text-left">
                          {item.subcategory}
                        </p>
                      </button>
                      {hasPhoto && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxItem(item); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: `${colors.fourth}cc` }}
                        >
                          <Visibility style={{ fontSize: 12 }} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {filteredItems.length === 0 && (
                  <div className="col-span-full py-8 text-center">
                    <p className="text-xs dark:text-dark-text/40 text-light-text/40">No items in this category</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile backdrop */}
      {closetOpen && (
        <div className="sm:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setClosetOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div
        className={`sm:hidden fixed z-40 bottom-0 left-0 right-0 h-[60vh] rounded-t-2xl border-t backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 shadow-2xl transition-transform duration-300 ease-out ${
          closetOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ borderColor: `${colors.fourth}20` }}
      >
        {/* Drag handle */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gray-400/30" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: `${colors.fourth}15` }}>
          <div className="flex items-center gap-2">
            <Checkroom style={{ color: colors.fourth, fontSize: 18 }} />
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">My Closet</h3>
          </div>
          <button
            onClick={() => setClosetOpen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center dark:text-dark-text/60 text-light-text/60"
          >
            <Close style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TYPE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium ${
                typeFilter === t ? "text-white" : "dark:text-dark-text/60 text-light-text/60"
              }`}
              style={{
                backgroundColor: typeFilter === t ? colors.fourth : "transparent",
                border: typeFilter === t ? "none" : `1px solid ${colors.fourth}30`,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="overflow-y-auto custom-scrollbar p-3" style={{ height: "calc(100% - 85px)", overscrollBehavior: "contain" }}>
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => {
              const imgSrc = item.thumbnailUrl || item.photoUrl;
              const hasPhoto = imgSrc && imgSrc !== "placeholder";
              const isSelected = selectedItem?._id === item._id;
              return (
                <button
                  key={item._id}
                  onClick={() => handleClosetItemClick(item)}
                  className={`rounded-lg overflow-hidden border transition-all ${isSelected ? "ring-2" : ""}`}
                  style={{
                    borderColor: isSelected ? colors.fourth : `${colors.fourth}25`,
                    ringColor: colors.fourth,
                  }}
                >
                  {hasPhoto ? (
                    <img src={imgSrc} alt={item.subcategory} className="w-full h-20 object-cover" />
                  ) : (
                    <div className="w-full h-20 flex items-center justify-center text-xl" style={{ backgroundColor: `${colors.fourth}08` }}>
                      {item.type === "Top" ? "👕" : item.type === "Bottom" ? "👖" : item.type === "Outerwear" ? "🧥" : item.type === "Shoes" ? "👟" : "⌚"}
                    </div>
                  )}
                  <p className="text-[9px] px-1.5 py-1 dark:text-dark-text/70 text-light-text/70 truncate">
                    {item.subcategory}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ Slot Grid (main content area) ═══ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === "grid" ? "text-white" : "dark:text-dark-text/40 text-light-text/40"
            }`}
            style={{
              backgroundColor: viewMode === "grid" ? colors.fourth : "transparent",
              borderColor: viewMode === "grid" ? colors.fourth : `${colors.fourth}30`,
            }}
            title="Grid View"
          >
            <GridViewRounded style={{ fontSize: 16 }} />
          </button>
          <button
            onClick={() => setViewMode("flatlay")}
            className={`p-2 rounded-lg border transition-all ${
              viewMode === "flatlay" ? "text-white" : "dark:text-dark-text/40 text-light-text/40"
            }`}
            style={{
              backgroundColor: viewMode === "flatlay" ? colors.fourth : "transparent",
              borderColor: viewMode === "flatlay" ? colors.fourth : `${colors.fourth}30`,
            }}
            title="Flat-lay View"
          >
            <ViewCozy style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Selected item banner (mobile tap-to-place) */}
        {selectedItem && (
          <div
            className="sm:hidden flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border"
            style={{ borderColor: colors.fourth, backgroundColor: `${colors.fourth}10` }}
          >
            <span className="text-[10px] font-medium" style={{ color: colors.fourth }}>
              Tap a slot to place: {selectedItem.subcategory}
            </span>
            <button
              onClick={() => setSelectedItem(null)}
              className="ml-auto w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${colors.fourth}20` }}
            >
              <Close style={{ fontSize: 12, color: colors.fourth }} />
            </button>
          </div>
        )}

        {/* Grid or Flat-lay Layout */}
        {viewMode === "grid" ? (
          /* ── Grid View (Bento) ── */
          <div className={`grid grid-cols-2 ${!closetOpen ? "lg:grid-cols-3" : ""} gap-3`}>
            {slots.map((slot) => (
              <div
                key={slot.key}
                onClick={() => {
                  if (selectedItem) handleSlotTapWithSelected(slot.key);
                }}
              >
                <SlotBox
                  slot={slot}
                  allItemsOfType={getItemsForSlot(slot)}
                  onUpdate={(item) => handleSlotUpdate(slot.key, item)}
                  onRemoveSlot={!defaultSlotKeys.includes(slot.key) ? () => handleRemoveSlot(slot.key) : undefined}
                  isCustom={!defaultSlotKeys.includes(slot.key)}
                />
              </div>
            ))}

            {/* Add Slot card */}
            <div className="relative">
              <button
                onClick={() => setShowAddSlot((p) => !p)}
                className="w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all hover:shadow-sm"
                style={{ borderColor: `${colors.fourth}25`, height: 220 }}
              >
                <Add style={{ color: colors.fourth, fontSize: 24, opacity: 0.4 }} />
                <span className="text-[10px] dark:text-dark-text/30 text-light-text/30">Add Slot</span>
              </button>

              {/* Add slot dropdown */}
              {showAddSlot && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowAddSlot(false)} />
                  <div
                    className="absolute top-full left-0 right-0 mt-1 z-40 rounded-xl border shadow-lg backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 p-2 max-h-48 overflow-y-auto"
                    style={{ borderColor: `${colors.fourth}30` }}
                  >
                    <p className="text-[9px] font-medium dark:text-dark-text/40 text-light-text/40 px-2 py-1">
                      Accessories
                    </p>
                    {ACCESSORY_SUBTYPES.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => handleAddSlot(sub)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
                      >
                        <span className="text-sm">{sub.emoji}</span>
                        <span className="text-xs dark:text-dark-text/70 text-light-text/70">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Flat-lay View (Positioned) ── */
          <div className="relative w-full" style={{ minHeight: "70vh", paddingBottom: "100%" }}>
            {/* Flat-lay canvas */}
            <div
              className="absolute inset-0 rounded-2xl border"
              style={{
                borderColor: `${colors.fourth}10`,
                backgroundColor: `${colors.fourth}03`,
              }}
            >
              {slots.map((slot) => {
                const position = getFlatlayPosition(slot.key);
                const photoUrl = slot.item?.nobgUrl || slot.item?.thumbnailUrl || slot.item?.photoUrl;

                return (
                  <div
                    key={slot.key}
                    className="absolute cursor-pointer transition-all hover:scale-105"
                    style={{
                      ...position,
                      maxWidth: position.width,
                    }}
                    onClick={() => {
                      if (selectedItem) handleSlotTapWithSelected(slot.key);
                    }}
                  >
                    {slot.item && photoUrl ? (
                      /* Filled slot - show item image */
                      <div className="relative group">
                        <img
                          src={photoUrl}
                          alt={slot.item.subcategory}
                          className="w-full h-auto object-contain drop-shadow-lg"
                          style={{
                            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
                          }}
                        />
                        {/* Slot label on hover */}
                        <div
                          className="absolute top-0 left-0 text-[8px] font-semibold px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: `${colors.fourth}90`, color: "white" }}
                        >
                          {slot.label}
                        </div>
                      </div>
                    ) : (
                      /* Empty slot - show placeholder */
                      <div
                        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 backdrop-blur-sm p-3 transition-all hover:shadow-md"
                        style={{
                          borderColor: `${colors.fourth}30`,
                          backgroundColor: `${colors.fourth}08`,
                          aspectRatio: "1",
                        }}
                      >
                        <span className="text-2xl opacity-30">{slot.emoji}</span>
                        <span className="text-[8px] dark:text-dark-text/30 text-light-text/30 text-center">
                          {slot.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Slot button (bottom-right corner) */}
              <button
                onClick={() => setShowAddSlot((p) => !p)}
                className="absolute bottom-4 right-4 w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-all hover:shadow-md z-50"
                style={{ borderColor: `${colors.fourth}40`, backgroundColor: `${colors.fourth}10` }}
              >
                <Add style={{ color: colors.fourth, fontSize: 20, opacity: 0.6 }} />
              </button>

              {/* Add slot dropdown */}
              {showAddSlot && (
                <>
                  <div className="fixed inset-0 z-[51]" onClick={() => setShowAddSlot(false)} />
                  <div
                    className="absolute bottom-16 right-4 z-[52] rounded-xl border shadow-lg backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 p-2 max-h-48 overflow-y-auto"
                    style={{ borderColor: `${colors.fourth}30`, minWidth: "150px" }}
                  >
                    <p className="text-[9px] font-medium dark:text-dark-text/40 text-light-text/40 px-2 py-1">
                      Accessories
                    </p>
                    {ACCESSORY_SUBTYPES.map((sub) => (
                      <button
                        key={sub.label}
                        onClick={() => handleAddSlot(sub)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-dark-secondary transition-colors"
                      >
                        <span className="text-sm">{sub.emoji}</span>
                        <span className="text-xs dark:text-dark-text/70 text-light-text/70">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Open Closet button */}
        {!closetOpen && (
          <button
            onClick={() => setClosetOpen(true)}
            className="mt-4 w-full py-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all hover:shadow-sm dark:text-dark-text/70 text-light-text/70"
            style={{ borderColor: `${colors.fourth}30` }}
          >
            <Checkroom style={{ fontSize: 16, color: colors.fourth }} />
            Open Closet
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxItem && lightboxItem.photoUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 cursor-pointer" onClick={() => setLightboxItem(null)}>
          <ImageLightbox src={lightboxItem.photoUrl} alt={lightboxItem.subcategory} onClose={() => setLightboxItem(null)} item={lightboxItem} scoped />
        </div>
      )}
    </div>
  );
}

export default SlotBuilder;
