import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Add, Visibility, VisibilityOff } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
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
  const containerRef = useRef(null);
  const [lightboxScrollTop, setLightboxScrollTop] = useState(0);
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
    // Capture current scroll position before opening lightbox
    if (containerRef.current) {
      setLightboxScrollTop(containerRef.current.scrollTop);
    }
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
    <div ref={containerRef} className="relative p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pr-12">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => navigate("/wardrobe")} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
            My Closet
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Global nobg toggle - only show if any item has nobgUrl */}
          {items.some((i) => i.nobgUrl) && (
            <button
              onClick={() => setShowNobgGlobal((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showNobgGlobal ? "text-white" : "dark:text-dark-text/70 text-light-text/70"
              }`}
              style={{
                backgroundColor: showNobgGlobal ? colors.fourth : "transparent",
                borderColor: showNobgGlobal ? colors.fourth : `${colors.fourth}40`,
              }}
              title={showNobgGlobal ? "Show original photos" : "Show processed (no background)"}
            >
              {showNobgGlobal ? <VisibilityOff style={{ fontSize: 16 }} /> : <Visibility style={{ fontSize: 16 }} />}
              {showNobgGlobal ? "Original" : "No BG"}
            </button>
          )}
          <button
            onClick={() => { setDroppedImage(null); setShowAddModal(true); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            <Add style={{ fontSize: 18 }} />
            Add Item
          </button>
        </div>
      </div>

      {/* Drop zone with tips */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { setDroppedImage(null); setShowAddModal(true); }}
        className={`rounded-xl border-2 border-dashed p-4 mb-4 text-center cursor-pointer transition-all
          ${isDragOver
            ? "border-solid bg-opacity-20"
            : "dark:border-dark-text/20 border-light-text/20"
          }`}
        style={{
          borderColor: isDragOver ? colors.fourth : undefined,
          backgroundColor: isDragOver ? `${colors.fourth}10` : undefined,
        }}
      >
        <p className="text-sm dark:text-dark-text/50 text-light-text/50">
          Drag & drop photos of your clothes, or click to add
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] dark:text-dark-text/30 text-light-text/30">
          <span>✓ Flat-lay or hanger shots work best</span>
          <span>✓ Photos with person? We'll extract the clothing</span>
          <span>✓ Good lighting = better color detection</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {CATEGORY_TABS.map((tab) => {
          const isActive = filter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${isActive ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
              style={{
                backgroundColor: isActive ? colors.fourth : "transparent",
                borderColor: isActive ? colors.fourth : `${colors.fourth}30`,
              }}
            >
              {tab.label} ({tabCount(tab.value)})
            </button>
          );
        })}
      </div>

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

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          onClose={() => { setShowAddModal(false); setDroppedImage(null); }}
          preloadedImage={droppedImage}
        />
      )}

      {/* Lightbox — positioned at current scroll to stay in view */}
      {lightboxItem && lightboxItem.photoUrl && (
        <div
          className="absolute left-0 right-0 z-[60] flex items-center justify-center bg-black/90 cursor-pointer"
          style={{
            top: lightboxScrollTop,
            height: containerRef.current?.clientHeight || "100%",
          }}
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
