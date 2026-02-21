import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowBack, Save, AutoAwesome, Add, Remove, CenterFocusStrong,
  Visibility, Close, Checkroom, Tune, DeleteOutline, GridView, Gesture,
  ContentCut, Image,
} from "@mui/icons-material";
import { CircularProgress } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import {
  fetchClosetThunk,
  saveOutfitThunk,
  fetchSuggestionThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import {
  addCanvasItem,
  updateCanvasItem,
  removeCanvasItem,
  clearCanvas,
  clearBuilder,
  setBuilderMeta,
  setBuilderMode,
  clearSuggestion,
  updateBuilderSlotItem,
} from "../../../../../redux/actions/wardrobe.actions";
import PremiumGate from "../shared/PremiumGate";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import CanvasItem from "./CanvasItem";
import SlotBuilder from "./SlotBuilder";
import ImageLightbox from "../MyCloset/ImageLightbox";
import { useAIContext } from "../../../../../context/AIContext";
import { buildWardrobeBaseContext } from "../../../../../utils/wardrobeAIContext";

const TYPE_TABS = ["All", "Top", "Bottom", "Full Body", "Outerwear", "Shoes"];
let canvasIdCounter = 0;

function OutfitBuilder() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { items: closetItems } = useSelector((s) => s.wardrobe.closet);
  const builder = useSelector((s) => s.wardrobe.builder);
  const { loading: sugLoading, result: sugResult, error: sugError } = useSelector((s) => s.wardrobe.suggestions);
  const { saving } = useSelector((s) => s.wardrobe.outfits);

  const [typeFilter, setTypeFilter] = useState("All");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [showNobg, setShowNobg] = useState(true);

  // New floating UI state
  const [closetDrawerOpen, setClosetDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCardVisible, setSettingsCardVisible] = useState(true); // floating summary card
  const [fabExpanded, setFabExpanded] = useState(false);

  // Canvas zoom/pan state
  const [canvasScale, setCanvasScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const canvasRef = useRef(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0 });

  const editOutfit = location.state?.editOutfit;

  // ── AI context ──────────────────────────────────────────────────
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const wardrobeState = useSelector((s) => s.wardrobe);
  useEffect(() => {
    const base = buildWardrobeBaseContext(wardrobeState);
    const mode = builder.mode;
    const meta = builder.meta;
    let desc = `User is in the Outfit Builder (${mode} mode).`;
    if (mode === "canvas") {
      desc += ` ${builder.canvasItems.length} items on canvas.`;
      const names = builder.canvasItems
        .map((ci) => closetItems.find((item) => item._id === ci.itemId))
        .filter(Boolean)
        .map((item) => item.subcategory || item.type)
        .slice(0, 5);
      if (names.length > 0) desc += ` Items: ${names.join(", ")}.`;
    } else {
      const filled = builder.slots.filter((s) => s.item).map((s) => `${s.label}: ${s.item.subcategory || s.item.type}`);
      desc += filled.length > 0 ? ` Filled slots: ${filled.join(", ")}.` : " No slots filled yet.";
    }
    if (meta.name) desc += ` Name: "${meta.name}".`;
    if (meta.occasion) desc += ` Occasion: ${meta.occasion}.`;
    if (meta.season) desc += ` Season: ${meta.season}.`;
    if (builder.processingStatus === "processing") desc += " Generating flat-lay preview.";
    if (builder.processingStatus === "ready") desc += " Flat-lay preview ready.";
    setAIPageContext({ page: "wardrobe/outfit-builder", description: `${base} ${desc}` });
    return () => clearAIPageContext();
  }, [builder.mode, builder.canvasItems.length, builder.slots, builder.meta, builder.processingStatus, closetItems.length, setAIPageContext, clearAIPageContext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (closetItems.length === 0) dispatch(fetchClosetThunk());
    const isMobile = window.innerWidth < 640;
    dispatch(setBuilderMode(isMobile ? "slots" : "canvas"));
    return () => { dispatch(clearBuilder()); };
  }, [dispatch, closetItems.length]);

  // Pre-populate builder when editing an existing outfit
  useEffect(() => {
    if (!editOutfit || closetItems.length === 0) return;
    const outfitItems = editOutfit.items || [];
    const isMobile = window.innerWidth < 640;

    // Flat-lay inspired positions for canvas mode
    const canvasPositions = {
      Top:       { x: 200, y: 30, w: 180, h: 210 },
      Outerwear: { x: 50,  y: 20, w: 170, h: 220 },
      Bottom:    { x: 160, y: 220, w: 180, h: 240 },
      Shoes:     { x: 280, y: 430, w: 140, h: 100 },
    };

    const slotMap = { Top: "top", Bottom: "bottom", Outerwear: "layer", Shoes: "footwear" };
    let zIdx = 1;

    for (const entry of outfitItems) {
      const resolved = entry.clothingItem || entry;
      const type = resolved.type;
      const fullItem = closetItems.find((ci) => ci._id === resolved._id) || resolved;

      // Populate slots (for slot mode / if user switches)
      const slotKey = slotMap[type];
      if (slotKey) dispatch(updateBuilderSlotItem(slotKey, fullItem));

      // Place on canvas (for canvas mode)
      if (!isMobile) {
        const pos = canvasPositions[type] || { x: 80 + zIdx * 60, y: 80 + zIdx * 40, w: 150, h: 180 };
        const id = `ci_edit_${++canvasIdCounter}_${Date.now()}`;
        dispatch(addCanvasItem({
          id,
          itemId: fullItem._id,
          x: pos.x,
          y: pos.y,
          width: pos.w,
          height: pos.h,
          rotation: 0,
          zIndex: zIdx++,
          locked: false,
        }));
      }
    }

    // Set metadata
    dispatch(setBuilderMeta({
      name: editOutfit.name || "",
      occasion: editOutfit.occasion || "",
      season: editOutfit.season || "",
      tags: editOutfit.tags || [],
      notes: editOutfit.notes || "",
    }));
  }, [editOutfit, closetItems, dispatch]);

  useEffect(() => {
    if (sugError) {
      const t = setTimeout(() => dispatch(clearSuggestion()), 5000);
      return () => clearTimeout(t);
    }
  }, [sugError, dispatch]);

  useEffect(() => {
    if (sugResult && !sugLoading) {
      setFeedbackMsg("AI suggestion received!");
      const t = setTimeout(() => setFeedbackMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [sugResult, sugLoading]);

  const filteredItems = typeFilter === "All"
    ? closetItems
    : closetItems.filter((i) => i.type === typeFilter);

  // ── Canvas handlers ──

  const addedToastRef = useRef(null);
  const addToCanvas = useCallback((item) => {
    const id = `ci_${++canvasIdCounter}_${Date.now()}`;
    const canvasW = canvasRef.current?.clientWidth || 800;
    const canvasH = canvasRef.current?.clientHeight || 600;
    const maxX = Math.max(10, canvasW - 160);
    const maxY = Math.max(10, canvasH - 190);
    dispatch(addCanvasItem({
      id,
      itemId: item._id,
      x: 40 + Math.random() * Math.min(maxX, 200),
      y: 60 + Math.random() * Math.min(maxY, 200),
      width: 150,
      height: 180,
      rotation: 0,
      zIndex: builder.canvasItems.length + 1,
    }));
    // Show brief "Added" toast
    setFeedbackMsg(`+ ${item.subcategory || "Item"} added`);
    if (addedToastRef.current) clearTimeout(addedToastRef.current);
    addedToastRef.current = setTimeout(() => setFeedbackMsg(null), 1500);
  }, [dispatch, builder.canvasItems.length]);

  const handleCanvasWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setCanvasScale((prev) => Math.min(3, Math.max(0.3, prev + delta)));
  }, []);

  const handleCanvasPointerDown = useCallback((e) => {
    // Only pan when clicking on canvas background (not items)
    const target = e.target;
    if (!canvasRef.current) return;
    if (target !== canvasRef.current && !target.dataset.canvasBg) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, startPanX: panX, startPanY: panY };

    const handleMove = (ev) => {
      if (!isPanning.current) return;
      setPanX(panStart.current.startPanX + (ev.clientX - panStart.current.x));
      setPanY(panStart.current.startPanY + (ev.clientY - panStart.current.y));
    };
    const handleUp = () => {
      isPanning.current = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [panX, panY]);

  const handleZoomIn = () => setCanvasScale((prev) => Math.min(3, prev + 0.2));
  const handleZoomOut = () => setCanvasScale((prev) => Math.max(0.3, prev - 0.2));
  const handleZoomReset = () => { setCanvasScale(1); setPanX(0); setPanY(0); };

  // ── AI Suggest ──

  const handleAiSuggest = () => {
    const meta = builder.meta;
    if (!meta.occasion || !meta.season) {
      setSettingsOpen(true);
      return;
    }
    const params = { occasion: meta.occasion, season: meta.season };
    if (aiDescription.trim()) params.description = aiDescription.trim();
    dispatch(fetchSuggestionThunk("full-outfit", params));
  };

  // ── Save ──

  const handleSave = async () => {
    const meta = builder.meta;
    let itemIds;

    if (builder.mode === "slots") {
      // Slot mode: collect IDs from filled slots
      itemIds = builder.slots.filter((s) => s.item).map((s) => s.item._id);
      if (itemIds.length === 0) {
        setFeedbackMsg("Add items to slots first");
        if (addedToastRef.current) clearTimeout(addedToastRef.current);
        addedToastRef.current = setTimeout(() => setFeedbackMsg(null), 3000);
        setShowSaveModal(false);
        return;
      }
    } else {
      // Canvas mode: collect IDs from locked items
      const lockedItems = builder.canvasItems.filter((ci) => ci.locked);
      if (lockedItems.length === 0) {
        setFeedbackMsg("Lock items first to save them");
        if (addedToastRef.current) clearTimeout(addedToastRef.current);
        addedToastRef.current = setTimeout(() => setFeedbackMsg(null), 3000);
        setShowSaveModal(false);
        return;
      }
      itemIds = [...new Set(lockedItems.map((ci) => ci.itemId))];
    }

    // Outfit validation: need Top+Bottom or Full Body, minimum 2 items
    const selectedItems = closetItems.filter((i) => itemIds.includes(i._id));
    const types = new Set(selectedItems.map((i) => i.type));
    const hasFullBody = types.has("Full Body");
    const hasTop = types.has("Top");
    const hasBottom = types.has("Bottom");
    if (!hasFullBody && !(hasTop && hasBottom)) {
      setFeedbackMsg("An outfit needs a Top + Bottom, or a Full Body item");
      if (addedToastRef.current) clearTimeout(addedToastRef.current);
      addedToastRef.current = setTimeout(() => setFeedbackMsg(null), 4000);
      setShowSaveModal(false);
      return;
    }
    if (itemIds.length < 2) {
      setFeedbackMsg("An outfit needs at least 2 items");
      if (addedToastRef.current) clearTimeout(addedToastRef.current);
      addedToastRef.current = setTimeout(() => setFeedbackMsg(null), 4000);
      setShowSaveModal(false);
      return;
    }

    const result = await dispatch(saveOutfitThunk({
      name: meta.name || "Untitled Outfit",
      occasion: meta.occasion,
      season: meta.season,
      tags: meta.tags,
      notes: meta.notes,
      itemIds,
      source: builder.mode === "slots" ? "builder-slots" : "builder",
    }));
    if (result?.success) {
      setShowSaveModal(false);
      navigate("/wardrobe/outfits");
    }
  };

  const canvasItemCount = builder.canvasItems.length;
  const slotItemCount = builder.slots.filter((s) => s.item).length;
  const hasItems = builder.mode === "slots" ? slotItemCount > 0 : canvasItemCount > 0;
  const isSlotMode = builder.mode === "slots";

  return (
    <PremiumGate requiredTier="Silver" message="Outfit Builder requires Silver or above" fullPage>
      <div className="relative w-full h-full overflow-hidden">

        {/* ═══════════════ SLOT MODE ═══════════════ */}
        {isSlotMode && (
          <SlotBuilder closetItems={closetItems} showNobg={showNobg} />
        )}

        {/* ═══════════════ LAYER 1: Full Canvas (canvas mode only) ═══════════════ */}
        {!isSlotMode && (
          <div
            ref={canvasRef}
            className="absolute inset-0 overflow-hidden"
            style={{ touchAction: "none" }}
            onWheel={handleCanvasWheel}
            onPointerDown={handleCanvasPointerDown}
          >
            {/* Grid line background */}
            <div
              data-canvas-bg="true"
              className="absolute inset-0 dark:bg-dark-secondary bg-gray-50"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px),
                  linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)
                `,
                backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
              }}
            />
            {/* Transform layer */}
            <div
              data-canvas-bg="true"
              className="absolute inset-0"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${canvasScale})`,
                transformOrigin: "0 0",
              }}
            >
              {builder.canvasItems.map((ci) => {
                const closetItem = closetItems.find((i) => i._id === ci.itemId);
                return (
                  <CanvasItem
                    key={ci.id}
                    item={ci}
                    closetItem={closetItem}
                    showNobg={showNobg}
                    onViewPhoto={() => closetItem && setLightboxItem(closetItem)}
                    x={ci.x}
                    y={ci.y}
                    width={ci.width}
                    height={ci.height}
                    rotation={ci.rotation}
                    zIndex={ci.zIndex}
                    locked={ci.locked || false}
                    canvasScale={canvasScale}
                    onMove={(nx, ny) => {
                      const canvasW = (canvasRef.current?.clientWidth || 800) / canvasScale;
                      const canvasH = (canvasRef.current?.clientHeight || 600) / canvasScale;
                      const minVisible = 20;
                      const cx = Math.max(-ci.width + minVisible, Math.min(canvasW - minVisible, nx));
                      const cy = Math.max(-ci.height + minVisible, Math.min(canvasH - minVisible, ny));
                      dispatch(updateCanvasItem(ci.id, { x: cx, y: cy }));
                    }}
                    onResize={(nw, nh) => {
                      const canvasW = (canvasRef.current?.clientWidth || 800) / canvasScale;
                      const canvasH = (canvasRef.current?.clientHeight || 600) / canvasScale;
                      const maxW = Math.max(40, canvasW - ci.x);
                      const maxH = Math.max(40, canvasH - ci.y);
                      dispatch(updateCanvasItem(ci.id, { width: Math.min(nw, maxW), height: Math.min(nh, maxH) }));
                    }}
                    onRotate={(nr) => dispatch(updateCanvasItem(ci.id, { rotation: nr }))}
                    onRemove={() => dispatch(removeCanvasItem(ci.id))}
                    onBringForward={() => {
                      const maxZ = Math.max(...builder.canvasItems.map((c) => c.zIndex), 0);
                      dispatch(updateCanvasItem(ci.id, { zIndex: maxZ + 1 }));
                    }}
                    onToggleLock={() => dispatch(updateCanvasItem(ci.id, { locked: !ci.locked }))}
                  />
                );
              })}
            </div>

            {/* Empty state */}
            {canvasItemCount === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-5xl mb-3 opacity-15">🎨</span>
                <p className="text-sm dark:text-dark-text/30 text-light-text/30 font-medium">
                  Open your closet to add items
                </p>
                <p className="text-[10px] dark:text-dark-text/20 text-light-text/20 mt-1">
                  Drag, resize, rotate freely
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ LAYER 2: Floating Top Toolbar ═══════════════ */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pr-14 py-2 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={() => { dispatch(clearBuilder()); navigate("/wardrobe"); }}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md dark:bg-dark-primary/80 bg-light-secondary/80 shadow-md border transition-all hover:scale-105"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <ArrowBack style={{ color: colors.fourth, fontSize: 16 }} />
            </button>
            <span className="text-sm font-semibold dark:text-dark-text text-light-text drop-shadow-sm">
              Outfit Builder
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Mode toggle */}
            <button
              onClick={() => dispatch(setBuilderMode(isSlotMode ? "canvas" : "slots"))}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md dark:bg-dark-primary/80 bg-light-secondary/80 shadow-md border transition-all hover:scale-105"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
              title={isSlotMode ? "Switch to Canvas" : "Switch to Slots"}
            >
              {isSlotMode ? (
                <Gesture style={{ color: colors.fourth, fontSize: 16 }} />
              ) : (
                <GridView style={{ color: colors.fourth, fontSize: 16 }} />
              )}
            </button>
            {/* No-background / Original photo toggle */}
            <button
              onClick={() => setShowNobg((p) => !p)}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md dark:bg-dark-primary/80 bg-light-secondary/80 shadow-md border transition-all hover:scale-105"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
              title={showNobg ? "Show original photos" : "Show no-background"}
            >
              {showNobg ? (
                <ContentCut style={{ color: colors.fourth, fontSize: 15 }} />
              ) : (
                <Image style={{ color: colors.fourth, fontSize: 16 }} />
              )}
            </button>
            {/* Save button */}
            {hasItems && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md dark:bg-dark-primary/80 bg-light-secondary/80 shadow-md border transition-all hover:scale-105"
                style={{ borderColor: toRgba(colors.fourth, 0.3) }}
                title="Save Outfit"
              >
                <Save style={{ color: colors.fourth, fontSize: 16 }} />
              </button>
            )}
          </div>
        </div>

        {/* ═══════════════ LAYER 3: Floating Zoom Controls (canvas only) ═══════════════ */}
        {!isSlotMode && (
          <div
            className="absolute bottom-4 left-4 z-20 flex items-center gap-0.5 rounded-full backdrop-blur-md px-1 py-1 shadow-lg border"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <button onClick={handleZoomOut} className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Zoom out">
              <Remove style={{ fontSize: 16 }} />
            </button>
            <button onClick={handleZoomReset} className="px-2 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors min-w-[40px]" title="Reset zoom">
              {Math.round(canvasScale * 100)}%
            </button>
            <button onClick={handleZoomIn} className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Zoom in">
              <Add style={{ fontSize: 16 }} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-0.5" />
            <button onClick={handleZoomReset} className="w-7 h-7 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Center view">
              <CenterFocusStrong style={{ fontSize: 14 }} />
            </button>
          </div>
        )}

        {/* ═══════════════ LAYER 4: Speed-Dial FAB (canvas only) ═══════════════ */}
        {!isSlotMode && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col-reverse items-end gap-2">
          {/* Main FAB */}
          <button
            onClick={() => setFabExpanded((p) => !p)}
            className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105"
            style={{
              backgroundColor: colors.fourth,
              transform: fabExpanded ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >
            <Add style={{ fontSize: 26 }} />
          </button>

          {/* Expanded actions */}
          {fabExpanded && (
            <>
              <FabAction
                icon={<Checkroom style={{ fontSize: 18 }} />}
                label="My Closet"
                onClick={() => { setClosetDrawerOpen(true); setFabExpanded(false); }}
                colors={colors}
              />
              <FabAction
                icon={<Tune style={{ fontSize: 18 }} />}
                label="Settings"
                onClick={() => { setSettingsOpen(true); setFabExpanded(false); }}
                colors={colors}
              />
              <FabAction
                icon={sugLoading ? <CircularProgress size={16} style={{ color: "white" }} /> : <AutoAwesome style={{ fontSize: 18 }} />}
                label="AI Suggest"
                onClick={() => { handleAiSuggest(); setFabExpanded(false); }}
                colors={colors}
              />
              {(builder.meta.occasion || builder.meta.season) && !settingsCardVisible && (
                <FabAction
                  icon={<Visibility style={{ fontSize: 18 }} />}
                  label="Show Settings"
                  onClick={() => { setSettingsCardVisible(true); setFabExpanded(false); }}
                  colors={colors}
                />
              )}
              {canvasItemCount > 0 && (
                <FabAction
                  icon={<DeleteOutline style={{ fontSize: 18 }} />}
                  label="Clear"
                  onClick={() => { dispatch(clearCanvas()); setFabExpanded(false); }}
                  colors={colors}
                  danger
                />
              )}
            </>
          )}
        </div>
        )}

        {/* FAB backdrop — close on click outside (canvas only) */}
        {!isSlotMode && fabExpanded && (
          <div className="absolute inset-0 z-[19]" onClick={() => setFabExpanded(false)} />
        )}

        {/* ═══════════════ LAYER 5: Closet Drawer (canvas only) ═══════════════ */}
        {!isSlotMode && (<>
        {closetDrawerOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/30"
            onClick={() => setClosetDrawerOpen(false)}
          />
        )}
        <div
          className={`absolute z-40 backdrop-blur-xl dark:bg-dark-primary/95 bg-light-secondary/95 shadow-2xl transition-transform duration-300 ease-out
            max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:h-[60vh] max-sm:rounded-t-2xl max-sm:border-t
            sm:top-0 sm:left-0 sm:bottom-0 sm:w-72 sm:border-r ${
            closetDrawerOpen
              ? "max-sm:translate-y-0 sm:translate-x-0"
              : "max-sm:translate-y-full sm:-translate-x-full"
          }`}
          style={{ borderColor: toRgba(colors.fourth, 0.2) }}
          onMouseLeave={() => {
            if (window.innerWidth >= 640) setClosetDrawerOpen(false);
          }}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
            {/* Mobile drag handle */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gray-400/30 sm:hidden" />
            <div className="flex items-center gap-2">
              <Checkroom style={{ color: colors.fourth, fontSize: 18 }} />
              <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">My Closet</h3>
              <span className="text-[9px] dark:text-dark-text/40 text-light-text/40">({filteredItems.length})</span>
            </div>
            <button
              onClick={() => setClosetDrawerOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border shadow-sm dark:bg-dark-primary/60 bg-light-secondary/60 dark:text-dark-text/60 text-light-text/60 hover:dark:text-dark-text hover:text-light-text transition-colors"
              style={{ borderColor: toRgba(colors.fourth, 0.2) }}
            >
              <Close style={{ fontSize: 14 }} />
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b" style={{ borderColor: toRgba(colors.fourth, 0.1) }}>
            {TYPE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                  typeFilter === t ? "text-white" : "dark:text-dark-text/60 text-light-text/60"
                }`}
                style={{
                  backgroundColor: typeFilter === t ? colors.fourth : "transparent",
                  border: typeFilter === t ? "none" : `1px solid ${toRgba(colors.fourth, 0.3)}`,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Items grid — 2 columns */}
          <div
            className="overflow-y-auto custom-scrollbar p-3"
            style={{ height: "calc(100% - 85px)", overscrollBehavior: "contain" }}
          >
            <div className="grid grid-cols-2 gap-2">
              {filteredItems.map((item) => {
                const imgSrc = item.thumbnailUrl || item.photoUrl;
                const hasPhoto = imgSrc && imgSrc !== "placeholder";
                return (
                  <div key={item._id} className="relative group">
                    <button
                      onClick={() => addToCanvas(item)}
                      className="w-full rounded-lg overflow-hidden border transition-all hover:shadow-md"
                      style={{ borderColor: toRgba(colors.fourth, 0.25) }}
                    >
                      {hasPhoto ? (
                        <img src={imgSrc} alt={item.subcategory} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center text-2xl" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
                          {item.type === "Top" ? "👕" : item.type === "Bottom" ? "👖" : item.type === "Full Body" ? "👗" : item.type === "Outerwear" ? "🧥" : item.type === "Shoes" ? "👟" : "👔"}
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
                        style={{ backgroundColor: toRgba(colors.fourth, 0.8) }}
                        title="View larger"
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
        </div>
        </>)}

        {/* ═══════════════ LAYER 6: Settings Popup ═══════════════ */}
        {settingsOpen && (
          <>
            <div className="absolute inset-0 z-30" onClick={() => setSettingsOpen(false)} />
            <div
              className="absolute top-12 right-14 z-40 w-72 rounded-xl backdrop-blur-xl dark:bg-dark-primary/70 bg-light-secondary/70 border shadow-2xl p-4"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold dark:text-dark-text text-light-text flex items-center gap-1.5">
                  <Tune style={{ fontSize: 14, color: colors.fourth }} />
                  Outfit Settings
                </h4>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="w-5 h-5 rounded-full flex items-center justify-center dark:text-dark-text/50 text-light-text/50 hover:bg-white/10"
                >
                  <Close style={{ fontSize: 14 }} />
                </button>
              </div>

              <OccasionSeasonPicker
                occasion={builder.meta.occasion}
                season={builder.meta.season}
                onOccasionChange={(v) => dispatch(setBuilderMeta({ occasion: v }))}
                onSeasonChange={(v) => dispatch(setBuilderMeta({ season: v }))}
              />

              <div className="mt-3">
                <label className="text-[10px] font-medium dark:text-dark-text/50 text-light-text/50 mb-1 block">
                  AI Description (optional)
                </label>
                <textarea
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Describe what you want..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-xs dark:bg-dark-secondary bg-white dark:text-dark-text text-light-text focus:outline-none transition-all resize-none"
                  style={{ borderColor: toRgba(colors.fourth, 0.3) }}
                />
              </div>

              {/* Done button */}
              <button
                onClick={() => { setSettingsOpen(false); setSettingsCardVisible(true); }}
                className="w-full mt-3 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: colors.fourth }}
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* ═══════════════ LAYER 6b: Floating Settings Summary Card ═══════════════ */}
        {!settingsOpen && (builder.meta.occasion || builder.meta.season) && settingsCardVisible && (
          <div
            className="absolute top-12 right-14 z-20 rounded-lg backdrop-blur-xl dark:bg-dark-primary/50 bg-light-secondary/50 border shadow-lg px-3 py-2 flex items-center gap-2"
            style={{ borderColor: toRgba(colors.fourth, 0.25) }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {builder.meta.occasion && (
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: colors.fourth }}>
                  {builder.meta.occasion}
                </span>
              )}
              {builder.meta.season && (
                <span className="text-[9px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: toRgba(colors.fourth, 0.73) }}>
                  {builder.meta.season}
                </span>
              )}
              {aiDescription.trim() && (
                <span className="text-[9px] px-2 py-0.5 rounded-full dark:text-dark-text/60 text-light-text/60 border truncate max-w-[100px]" style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
                  {aiDescription.trim()}
                </span>
              )}
            </div>
            <button
              onClick={() => setSettingsCardVisible(false)}
              className="w-4 h-4 rounded-full flex items-center justify-center dark:text-dark-text/40 text-light-text/40 hover:dark:text-dark-text/70 hover:text-light-text/70 flex-shrink-0"
              title="Hide settings card"
            >
              <Close style={{ fontSize: 10 }} />
            </button>
          </div>
        )}

        {/* ═══════════════ LAYER 7: Toast Messages ═══════════════ */}
        {sugError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-lg bg-red-500/90 backdrop-blur-sm px-4 py-2 shadow-lg">
            <p className="text-xs text-white font-medium">{sugError}</p>
          </div>
        )}
        {feedbackMsg && (
          <div
            className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rounded-lg backdrop-blur-sm px-4 py-2 shadow-lg"
            style={{ backgroundColor: toRgba(colors.fourth, 0.93) }}
          >
            <p className="text-xs text-white font-medium">{feedbackMsg}</p>
          </div>
        )}

        {/* ═══════════════ LAYER 8: Save Modal ═══════════════ */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-2xl dark:bg-dark-primary bg-light-secondary border p-6" style={{ borderColor: toRgba(colors.fourth, 0.3) }}>
              <h3 className="text-base font-semibold dark:text-dark-text text-light-text mb-3">Save Outfit</h3>

              {/* Items info */}
              {isSlotMode ? (
                <p className="text-[11px] dark:text-dark-text/50 text-light-text/50 mb-3">
                  {slotItemCount} item{slotItemCount !== 1 ? "s" : ""} in slots will be saved
                </p>
              ) : (
                (() => {
                  const lockedItems = builder.canvasItems.filter((ci) => ci.locked);
                  const unlockedCount = builder.canvasItems.length - lockedItems.length;
                  return (
                    <>
                      {lockedItems.length > 0 && (
                        <p className="text-[11px] dark:text-dark-text/50 text-light-text/50 mb-1">
                          {lockedItems.length} locked item{lockedItems.length > 1 ? "s" : ""} will be saved
                        </p>
                      )}
                      {unlockedCount > 0 && (
                        <p className="text-[11px] text-amber-500 dark:text-amber-400 mb-3">
                          {lockedItems.length === 0
                            ? "No items are locked. Lock items on the canvas to include them."
                            : `${unlockedCount} unlocked item${unlockedCount > 1 ? "s" : ""} will not be saved.`}
                        </p>
                      )}
                    </>
                  );
                })()
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs dark:text-dark-text/60 text-light-text/60 mb-1 block">Name</label>
                  <input value={builder.meta.name} onChange={(e) => dispatch(setBuilderMeta({ name: e.target.value }))} placeholder="e.g. Office Monday" className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-secondary bg-white dark:text-dark-text text-light-text" style={{ borderColor: toRgba(colors.fourth, 0.3) }} />
                </div>
                <OccasionSeasonPicker occasion={builder.meta.occasion} season={builder.meta.season} onOccasionChange={(v) => dispatch(setBuilderMeta({ occasion: v }))} onSeasonChange={(v) => dispatch(setBuilderMeta({ season: v }))} />
                <div>
                  <label className="text-xs dark:text-dark-text/60 text-light-text/60 mb-1 block">Notes</label>
                  <textarea value={builder.meta.notes} onChange={(e) => dispatch(setBuilderMeta({ notes: e.target.value }))} placeholder="Optional notes..." rows={2} className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-secondary bg-white dark:text-dark-text text-light-text resize-none" style={{ borderColor: toRgba(colors.fourth, 0.3) }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-lg text-sm dark:text-dark-text/60 text-light-text/60">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-40" style={{ backgroundColor: colors.fourth }}>
                  {saving && <CircularProgress size={14} style={{ color: "white" }} />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ LAYER 9: Lightbox ═══════════════ */}
        {lightboxItem && lightboxItem.photoUrl && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 cursor-pointer" onClick={() => setLightboxItem(null)}>
            <ImageLightbox src={lightboxItem.photoUrl} alt={lightboxItem.subcategory} onClose={() => setLightboxItem(null)} item={lightboxItem} scoped />
          </div>
        )}

      </div>
    </PremiumGate>
  );
}

/* ── Helper: FAB Action Button ── */
function FabAction({ icon, label, onClick, colors, danger }) {
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
      <span className="text-[10px] font-medium px-2 py-1 rounded-md backdrop-blur-sm whitespace-nowrap shadow-md" style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "white" }}>
        {label}
      </span>
      <button
        onClick={onClick}
        className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all hover:scale-105"
        style={{ backgroundColor: danger ? "#ef4444" : toRgba(colors.fourth, 0.87) }}
      >
        {icon}
      </button>
    </div>
  );
}

export default OutfitBuilder;
