import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Add, Visibility, VisibilityOff, FilterList, ExpandMore } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { fetchClosetThunk, processItemThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { setClosetFilter } from "../../../../../redux/actions/wardrobe.actions";
import ClothingCard from "./ClothingCard";
import AddItemModal from "./AddItemModal";
import ImageLightbox from "./ImageLightbox";

const CATEGORY_TABS = [
  { label: "All", value: "All" },
  { label: "Tops", value: "Top" },
  { label: "Bottoms", value: "Bottom" },
  { label: "Layers", value: "Outerwear" },
  { label: "Footwear", value: "Shoes" },
];

function MyCloset() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, loading, filter } = useSelector((state) => state.wardrobe.closet);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedImage, setDroppedImage] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showNobgGlobal, setShowNobgGlobal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const containerRef = useRef(null);
  const reprocessedRef = useRef(new Set()); // Track items already queued for reprocessing

  useEffect(() => {
    dispatch(fetchClosetThunk());
  }, [dispatch]);

  // Reprocess stuck items (missing nobgUrl) on load
  useEffect(() => {
    if (loading || items.length === 0) return;

    const stuckItems = items.filter((item) =>
      !item.nobgUrl &&
      item.processingStatus !== "completed" &&
      item.photoUrl &&
      !reprocessedRef.current.has(item._id)
    );

    if (stuckItems.length > 0) {
      console.log(`[MyCloset] Reprocessing ${stuckItems.length} stuck item(s)`);
      stuckItems.forEach((item) => {
        reprocessedRef.current.add(item._id);
        dispatch(processItemThunk({
          itemId: item._id,
          photoUrl: item.photoUrl,
          itemType: item.type,
          hasPersonInPhoto: item.hasPersonInPhoto ?? true,
        }));
      });
    }
  }, [items, loading, dispatch]);

  const filteredItems = filter === "All"
    ? items
    : items.filter((item) => item.type === filter);

  const handleTabChange = (value) => {
    dispatch(setClosetFilter("type", value));
  };

  const handleOpenLightbox = useCallback((item) => {
    setLightboxItem(item);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxItem(null);
  }, []);

  // Image drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      setDroppedImage(files[0]);
      setShowAddModal(true);
    }
  }, []);

  const tabCount = (type) => {
    if (type === "All") return items.length;
    return items.filter((i) => i.type === type).length;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 dark:bg-dark-primary bg-light-secondary px-2 sm:px-4 pt-2 sm:pt-4 pb-2 border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between pr-10 sm:pr-12 mb-1 sm:mb-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <IconButton onClick={() => navigate("/wardrobe")} size="small">
              <ArrowBack style={{ color: colors.fourth, fontSize: 20 }} />
            </IconButton>
            <h2 className="text-base sm:text-lg font-semibold dark:text-dark-text text-light-text">
              My Closet
            </h2>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Global nobg toggle - icon only on mobile */}
            {items.some((i) => i.nobgUrl) && (
              <button
                onClick={() => setShowNobgGlobal((p) => !p)}
                className={`flex items-center justify-center gap-1.5 w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  showNobgGlobal ? "text-white" : "dark:text-dark-text/70 text-light-text/70"
                }`}
                style={{
                  backgroundColor: showNobgGlobal ? colors.fourth : "transparent",
                  borderColor: showNobgGlobal ? colors.fourth : toRgba(colors.fourth, 0.4),
                }}
                title={showNobgGlobal ? "Show original photos" : "Show processed (no background)"}
              >
                {showNobgGlobal ? <VisibilityOff style={{ fontSize: 16 }} /> : <Visibility style={{ fontSize: 16 }} />}
                <span className="hidden sm:inline">{showNobgGlobal ? "Original" : "No BG"}</span>
              </button>
            )}
            {/* Add button - icon only on mobile */}
            <button
              onClick={() => { setDroppedImage(null); setShowAddModal(true); }}
              className="flex items-center justify-center gap-1 w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.fourth }}
              title="Add item"
            >
              <Add style={{ fontSize: 18 }} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          </div>
        </div>

        {/* Drop zone - hidden on mobile (no drag/drop support) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => { setDroppedImage(null); setShowAddModal(true); }}
          className={`hidden sm:block rounded-lg border-2 border-dashed px-3 py-2 text-center cursor-pointer transition-all
            ${isDragOver
              ? "border-solid bg-opacity-20"
              : "dark:border-dark-text/20 border-light-text/20"
            }`}
          style={{
            borderColor: isDragOver ? colors.fourth : undefined,
            backgroundColor: isDragOver ? toRgba(colors.fourth, 0.1) : undefined,
          }}
        >
          <p className="text-xs dark:text-dark-text/50 text-light-text/50">
            Drag & drop photos here, or click to add items
          </p>
        </div>

        {/* Category filter toggle */}
        <div className="mt-1 sm:mt-2">
          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{
              backgroundColor: filter !== "All" ? toRgba(colors.fourth, 0.15) : "transparent",
              borderColor: toRgba(colors.fourth, 0.4),
            }}
          >
            <FilterList style={{ fontSize: 16, color: colors.fourth }} />
            <span className="dark:text-dark-text text-light-text">
              {filter === "All" ? "All Items" : CATEGORY_TABS.find((t) => t.value === filter)?.label}
            </span>
            <span className="dark:text-dark-text/50 text-light-text/50">
              ({tabCount(filter)})
            </span>
            <ExpandMore
              style={{
                fontSize: 16,
                color: colors.fourth,
                transition: "transform 0.3s ease-out",
                transform: showFilters ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {/* Expanded filter options - animated container */}
          <div
            className="overflow-hidden transition-all duration-300 ease-out"
            style={{
              maxHeight: showFilters ? "120px" : "0px",
              opacity: showFilters ? 1 : 0,
              marginTop: showFilters ? "8px" : "0px",
            }}
          >
            <div className="flex flex-wrap gap-1.5 pb-1">
              {CATEGORY_TABS.map((tab) => {
                const isActive = filter === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      handleTabChange(tab.value);
                      setShowFilters(false);
                    }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                      ${isActive ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                    style={{
                      backgroundColor: isActive ? colors.fourth : "transparent",
                      borderColor: isActive ? colors.fourth : toRgba(colors.fourth, 0.3),
                    }}
                  >
                    {tab.label} ({tabCount(tab.value)})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
      {/* Items grid — fills available width */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <CircularProgress style={{ color: colors.fourth }} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 dark:text-dark-text/40 text-light-text/40">
          <CheckroomEmpty />
          <p className="text-sm mt-2">
            {items.length === 0 ? "Add your first item" : "No items in this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
          {filteredItems.map((item) => (
            <ClothingCard key={item._id} item={item} onOpenLightbox={handleOpenLightbox} showNobgGlobal={showNobgGlobal} />
          ))}
        </div>
      )}
      </div>

      {/* Add item drawer - backdrop */}
      {showAddModal && (
        <div
          className="absolute inset-0 z-30 bg-black/30"
          onClick={() => { setShowAddModal(false); setDroppedImage(null); }}
        />
      )}

      {/* Add item drawer - slide-in panel */}
      <div
        className={`absolute z-40 backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 shadow-2xl transition-transform duration-300 ease-out
          max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:h-[85vh] max-sm:rounded-t-2xl max-sm:border-t
          sm:top-0 sm:right-0 sm:bottom-0 sm:w-96 sm:border-l ${
          showAddModal
            ? "max-sm:translate-y-0 sm:translate-x-0"
            : "max-sm:translate-y-full sm:translate-x-full"
        }`}
        style={{ borderColor: toRgba(colors.fourth, 0.2) }}
      >
        {showAddModal && (
          <AddItemModal
            onClose={() => { setShowAddModal(false); setDroppedImage(null); }}
            preloadedImage={droppedImage}
            isDrawer
          />
        )}
      </div>

      {/* Lightbox — full coverage within this component */}
      {lightboxItem && lightboxItem.photoUrl && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={handleCloseLightbox}
        >
          <ImageLightbox
            src={showNobgGlobal && lightboxItem.nobgUrl ? lightboxItem.nobgUrl : lightboxItem.photoUrl}
            alt={lightboxItem.subcategory}
            onClose={handleCloseLightbox}
            item={lightboxItem}
            showNobg={showNobgGlobal && !!lightboxItem.nobgUrl}
            scoped
          />
        </div>
      )}
    </div>
  );
}

function CheckroomEmpty() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3c0 1.5 1.5 3 3 3s3-1.5 3-3a3 3 0 0 0-3-3z" />
      <path d="M20 21H4l3.5-7h9L20 21z" />
      <path d="M12 8v6" />
    </svg>
  );
}

export default MyCloset;
