import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Add, Visibility, VisibilityOff, FilterList, ExpandMore } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { fetchClosetThunk, processItemThunk, fetchCollectionsThunk, createCollectionThunk, updateCollectionThunk, deleteCollectionThunk, addItemsToCollectionThunk, removeItemsFromCollectionThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { setClosetFilter, setActiveCollection } from "../../../../../redux/actions/wardrobe.actions";
import ClothingCard from "./ClothingCard";
import AddItemModal from "./AddItemModal";
import ImageLightbox from "./ImageLightbox";
import CreateCollectionModal from "./CreateCollectionModal";

const CLOSET_QUOTES = [
  "Your style story, one piece at a time",
  "Looking good is the best revenge",
  "Life's too short to wear boring clothes",
  "Confidence looks good on you",
  "Every outfit is a mood",
  "Style is a reflection of your attitude",
  "Own it. Wear it. Love it.",
  "Less browsing, more styling",
];

const CATEGORY_TABS = [
  { label: "All", value: "All" },
  { label: "Tops", value: "Top" },
  { label: "Bottoms", value: "Bottom" },
  { label: "Full Body", value: "Full Body" },
  { label: "Layers", value: "Outerwear" },
  { label: "Footwear", value: "Shoes" },
];

function MyCloset() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, loading, filter } = useSelector((state) => state.wardrobe.closet);
  const { list: collections, activeId: activeCollectionId } = useSelector((state) => state.wardrobe.collections);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedImage, setDroppedImage] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showNobgGlobal, setShowNobgGlobal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [collectionMenuId, setCollectionMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const containerRef = useRef(null);
  const reprocessedRef = useRef(new Set()); // Track items already queued for reprocessing
  const [closetQuote] = useState(() => CLOSET_QUOTES[Math.floor(Math.random() * CLOSET_QUOTES.length)]);

  useEffect(() => {
    dispatch(fetchClosetThunk());
    dispatch(fetchCollectionsThunk());
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

  // Active collection's itemIds set for filtering
  const activeCollection = activeCollectionId ? collections.find((c) => c._id === activeCollectionId) : null;
  const collectionItemSet = activeCollection ? new Set(activeCollection.itemIds.map((id) => typeof id === "object" ? id._id : id)) : null;

  const filteredItems = items.filter((item) => {
    if (collectionItemSet && !collectionItemSet.has(item._id)) return false;
    if (filter !== "All" && item.type !== filter) return false;
    return true;
  });

  // ─── Selection mode (bulk add/remove from collection) ────────
  const originalIds = activeCollection
    ? new Set(activeCollection.itemIds.map((id) => (typeof id === "object" ? id._id : id)))
    : new Set();

  const enterSelectionMode = () => {
    if (!activeCollection) return;
    setSelectedIds(new Set(originalIds));
    setSelectionMode(true);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelectItem = useCallback((itemId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const toAdd = selectionMode ? [...selectedIds].filter((id) => !originalIds.has(id)) : [];
  const toRemove = selectionMode ? [...originalIds].filter((id) => !selectedIds.has(id)) : [];

  const handleBulkSave = async () => {
    if (toAdd.length > 0) {
      dispatch(addItemsToCollectionThunk(activeCollection._id, toAdd));
    }
    if (toRemove.length > 0) {
      dispatch(removeItemsFromCollectionThunk(activeCollection._id, toRemove));
    }
    exitSelectionMode();
  };

  // In selection mode, show ALL items (override collection filter) so user can pick new ones
  const displayItems = selectionMode
    ? items.filter((item) => filter === "All" || item.type === filter)
    : filteredItems;

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
            <div>
              <h2 className="text-base sm:text-lg font-semibold dark:text-dark-text text-light-text">
                My Closet
              </h2>
              <p className="text-[10px] dark:text-dark-text/30 text-light-text/30 italic -mt-0.5">
                {closetQuote}
              </p>
            </div>
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

        {/* Collection pills */}
        {(collections.length > 0 || items.length > 0) && (
          <div className="mt-1.5 sm:mt-2 relative">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {/* All pill */}
              <button
                onClick={() => dispatch(setActiveCollection(null))}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  !activeCollectionId ? "text-white" : "dark:text-dark-text/70 text-light-text/70"
                }`}
                style={{
                  backgroundColor: !activeCollectionId ? colors.fourth : "transparent",
                  borderColor: !activeCollectionId ? colors.fourth : toRgba(colors.fourth, 0.25),
                }}
              >
                All
              </button>

              {collections.map((col) => {
                const isActive = activeCollectionId === col._id;
                const count = col.itemIds?.length || 0;
                return (
                  <button
                    key={col._id}
                    onClick={() => dispatch(setActiveCollection(isActive ? null : col._id))}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuPos({ x: e.clientX, y: e.clientY });
                      setCollectionMenuId(collectionMenuId === col._id ? null : col._id);
                    }}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      isActive ? "text-white" : "dark:text-dark-text/70 text-light-text/70"
                    }`}
                    style={{
                      backgroundColor: isActive ? (col.color || colors.fourth) : "transparent",
                      borderColor: isActive ? (col.color || colors.fourth) : toRgba(colors.fourth, 0.25),
                    }}
                  >
                    {col.emoji && <span className="text-xs">{col.emoji}</span>}
                    <span className="truncate max-w-[80px]">{col.name}</span>
                    <span className={`text-[9px] ${isActive ? "text-white/70" : "dark:text-dark-text/40 text-light-text/40"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Create new collection button */}
              <button
                onClick={() => { setEditingCollection(null); setShowCreateCollection(true); }}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-all hover:opacity-80"
                style={{
                  borderColor: toRgba(colors.fourth, 0.3),
                  color: colors.fourth,
                }}
                title="New collection"
              >
                <Add style={{ fontSize: 14 }} />
              </button>
            </div>

            {/* Active collection action bar */}
            {activeCollection && !selectionMode && (
              <div
                className="flex items-center gap-2 mt-1.5 px-1 py-1"
                style={{ animation: "fadeSlideIn 0.2s ease-out both" }}
              >
                <span className="text-[11px] dark:text-dark-text/50 text-light-text/50">
                  {activeCollection.emoji || "📁"} <span className="font-medium dark:text-dark-text/70 text-light-text/70">{activeCollection.name}</span> — {activeCollection.itemIds?.length || 0} items
                </span>
                <span className="dark:text-dark-text/20 text-light-text/20">|</span>
                <button
                  onClick={enterSelectionMode}
                  className="text-[11px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: colors.fourth }}
                >
                  Select
                </button>
                <button
                  onClick={() => {
                    setEditingCollection(activeCollection);
                    setShowCreateCollection(true);
                  }}
                  className="text-[11px] font-medium hover:opacity-70 transition-opacity"
                  style={{ color: colors.fourth }}
                >
                  Edit
                </button>
                <button
                  onClick={() => dispatch(deleteCollectionThunk(activeCollection._id))}
                  className="text-[11px] font-medium text-red-400 hover:opacity-70 transition-opacity"
                >
                  Delete
                </button>
              </div>
            )}

            {/* Selection mode bar */}
            {selectionMode && (
              <div
                className="flex items-center gap-2 mt-1.5 px-1 py-1"
                style={{ animation: "fadeSlideIn 0.2s ease-out both" }}
              >
                <span className="text-[11px] dark:text-dark-text/60 text-light-text/60">
                  {selectedIds.size} selected
                  {toAdd.length > 0 && <span className="text-green-500 ml-1">+{toAdd.length}</span>}
                  {toRemove.length > 0 && <span className="text-red-400 ml-1">-{toRemove.length}</span>}
                </span>
                <span className="flex-1" />
                <button
                  onClick={exitSelectionMode}
                  className="text-[11px] font-medium dark:text-dark-text/50 text-light-text/50 hover:opacity-70 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkSave}
                  disabled={toAdd.length === 0 && toRemove.length === 0}
                  className="text-[11px] font-medium text-white px-2.5 py-1 rounded-full transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: colors.fourth }}
                >
                  Save
                </button>
              </div>
            )}
          </div>
        )}

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
      ) : displayItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 dark:text-dark-text/40 text-light-text/40">
          <CheckroomEmpty />
          <p className="text-sm mt-2">
            {items.length === 0 ? "Add your first item" : "No items in this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4 gap-3">
          {displayItems.map((item) => (
            <ClothingCard
              key={item._id}
              item={item}
              onOpenLightbox={selectionMode ? undefined : handleOpenLightbox}
              showNobgGlobal={showNobgGlobal}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item._id)}
              onToggleSelect={toggleSelectItem}
            />
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
            targetCollection={activeCollection ? { _id: activeCollection._id, name: activeCollection.name, emoji: activeCollection.emoji } : null}
          />
        )}
      </div>

      {/* Collection context menu (fixed position, outside overflow) */}
      {collectionMenuId && (() => {
        const col = collections.find((c) => c._id === collectionMenuId);
        if (!col) return null;
        return (
          <>
            <div className="fixed inset-0 z-[25]" onClick={() => setCollectionMenuId(null)} />
            <div
              className="fixed z-[26] rounded-lg shadow-lg border dark:bg-dark-primary bg-light-secondary py-1 min-w-[120px]"
              style={{
                left: menuPos.x,
                top: menuPos.y + 4,
                borderColor: toRgba(colors.fourth, 0.2),
              }}
            >
              <button
                onClick={() => {
                  setEditingCollection(col);
                  setShowCreateCollection(true);
                  setCollectionMenuId(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs dark:text-dark-text text-light-text hover:bg-black/5 dark:hover:bg-white/5"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  dispatch(deleteCollectionThunk(col._id));
                  setCollectionMenuId(null);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
              >
                Delete
              </button>
            </div>
          </>
        );
      })()}

      {/* Create/Edit collection modal */}
      {showCreateCollection && (
        <CreateCollectionModal
          onClose={() => { setShowCreateCollection(false); setEditingCollection(null); }}
          editCollection={editingCollection}
        />
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

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
