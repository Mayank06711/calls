import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowBack, Close, AutoAwesome, Save, ShuffleOutlined, CheckCircleOutline,
  OpenInNew, InfoOutlined, PhotoOutlined,
} from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { fetchClosetThunk, fetchSuggestionThunk, saveOutfitThunk, fetchOutfitsThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { clearSuggestion } from "../../../../../redux/actions/wardrobe.actions";
import { makeRequest } from "../../../../../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../../../../../constants/apiEndpoints";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import OutfitCard from "../Outfits/OutfitCard";
import ImageLightbox from "../MyCloset/ImageLightbox";
import { useAIContext } from "../../../../../context/AIContext";
import { buildWardrobeBaseContext } from "../../../../../utils/wardrobeAIContext";

const FILTER_TABS = ["All", "Top", "Bottom"];

/* ── Derive default season from current month ── */
function getAutoSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 5) return "Summer";   // Mar–Jun
  if (m >= 6 && m <= 9) return "Monsoon";  // Jul–Oct
  return "Winter";                          // Nov–Feb
}

/* ── Derive a reasonable default occasion from style profile ── */
function getAutoOccasion(profile) {
  if (!profile) return "Casual";
  const lt = profile.lifestyleTypes || [];
  if (lt.includes("Office Formal") || lt.includes("Office Casual")) return "Office: Daily Wear";
  if (lt.includes("Social Events")) return "Date Night";
  if (lt.includes("Casual")) return "Casual";
  if (lt.includes("Work From Home")) return "Lounge";

  const v = profile.styleVibe || "";
  if (v === "Classic" || v === "Old Money") return "Office: Daily Wear";
  if (v === "Trendy") return "Party: Night Out";
  if (v === "Desi") return "Festive";
  return "Casual";
}

/* ── Loading skeleton for bento grid ── */
function GridSkeleton({ colors, count = 6 }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border animate-pulse" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
          <div className="w-full h-[100px] dark:bg-dark-text/5 bg-light-text/5" />
          <div className="p-2 space-y-1.5">
            <div className="h-2.5 rounded dark:bg-dark-text/8 bg-light-text/8 w-3/4" />
            <div className="h-2 rounded dark:bg-dark-text/5 bg-light-text/5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FromItem() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items: closetItems } = useSelector((s) => s.wardrobe.closet);
  const { loading, result, error } = useSelector((s) => s.wardrobe.suggestions);
  const { saving, saved: savedOutfits } = useSelector((s) => s.wardrobe.outfits);
  const styleProfile = useSelector((s) => s.wardrobe.styleProfile?.data);

  const [selectedItem, setSelectedItem] = useState(null);
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [filterTab, setFilterTab] = useState("All");
  const [lightboxData, setLightboxData] = useState(null);
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Picks from suggestion cards (for live preview + save)
  const [picks, setPicks] = useState({ bottom: null, layer: null, footwear: null, top: null });
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [previewMode, setPreviewMode] = useState("flatlay"); // "flatlay" | "photos"

  // Continue flow: refined layers + footwear after user picks a bottom
  const [continuedLayers, setContinuedLayers] = useState(null);   // { options, wardrobeMatches, productRecommendations }
  const [continuedFootwear, setContinuedFootwear] = useState(null);
  const [showLayers, setShowLayers] = useState(false);             // user explicitly requested layers
  const [showFootwear, setShowFootwear] = useState(false);         // user explicitly requested footwear
  const [layerLoading, setLayerLoading] = useState(false);
  const [footwearLoading, setFootwearLoading] = useState(false);
  const [nudge, setNudge] = useState(null);                        // { type: "layer"|"footwear" } or null

  // ── AI context ──────────────────────────────────────────────────
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const wardrobeState = useSelector((s) => s.wardrobe);
  useEffect(() => {
    const base = buildWardrobeBaseContext(wardrobeState);
    let desc = "User is on Mix & Match, building an outfit by picking a starting item and getting AI-matched suggestions.";
    if (selectedItem) {
      const color = selectedItem.dominantColors?.[0]?.name || "";
      desc += ` Anchor item: ${color ? color + " " : ""}${selectedItem.subcategory || selectedItem.type}.`;
    }
    if (result) {
      desc += " AI suggestions available.";
      const picked = Object.entries(picks).filter(([, v]) => v);
      if (picked.length > 0) {
        desc += ` Picked: ${picked.map(([slot, item]) => `${slot}: ${item.subcategory || item.name || "item"}`).join(", ")}.`;
      }
    }
    setAIPageContext({ page: "wardrobe/suggest/from-item", description: `${base} ${desc}` });
    return () => clearAIPageContext();
  }, [selectedItem?._id, result, picks, wardrobeState.closet?.items?.length, setAIPageContext, clearAIPageContext]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (closetItems.length === 0) dispatch(fetchClosetThunk());
    if (!savedOutfits || savedOutfits.length === 0) dispatch(fetchOutfitsThunk());
  }, [dispatch, closetItems.length, savedOutfits?.length]);

  // Auto-dismiss nudge after 5 seconds
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(null), 5000);
    return () => clearTimeout(t);
  }, [nudge]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => dispatch(clearSuggestion()), 5000);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  /* ── Auto-default occasion & season when an item is first selected ── */
  useEffect(() => {
    if (!selectedItem) return;
    if (occasion && season) return; // user already picked values

    const autoSeason = getAutoSeason();
    const autoOccasion = getAutoOccasion(styleProfile);

    if (!season) setSeason(autoSeason);
    if (!occasion) setOccasion(autoOccasion);
    setDefaultsApplied(true);

    const t = setTimeout(() => setDefaultsApplied(false), 4000);
    return () => clearTimeout(t);
  }, [selectedItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse suggestion results
  const suggestion = result?.suggestion || result;
  // Merge wardrobe matches from original results + continued layer/footwear calls
  const wardrobeMatches = useMemo(() => ({
    ...(result?.wardrobeMatches || {}),
    ...(continuedLayers?.wardrobeMatches || {}),
    ...(continuedFootwear?.wardrobeMatches || {}),
  }), [result, continuedLayers, continuedFootwear]);

  const productRecommendations = useMemo(() => ({
    ...(result?.productRecommendations || {}),
    ...(continuedLayers?.productRecommendations || {}),
    ...(continuedFootwear?.productRecommendations || {}),
  }), [result, continuedLayers, continuedFootwear]);

  const matchedItems = useMemo(() => suggestion?.bottom || suggestion?.topSuggestions || [], [suggestion]);
  // Only show continued layers/footwear if user explicitly requested them
  const layers = useMemo(() => {
    if (showLayers && continuedLayers?.options) return continuedLayers.options;
    return suggestion?.layers?.options || [];
  }, [suggestion, continuedLayers, showLayers]);
  const footwear = useMemo(() => {
    if (showFootwear && continuedFootwear?.options) return continuedFootwear.options;
    return suggestion?.footwear?.options || [];
  }, [suggestion, continuedFootwear, showFootwear]);

  const hasResults = matchedItems.length > 0 || layers.length > 0 || footwear.length > 0;

  // Vibe tags from suggestion
  const vibeTags = useMemo(() => {
    const tags = [];
    if (suggestion?.overallVibe) tags.push(suggestion.overallVibe);
    [...matchedItems, ...layers, ...footwear].forEach((i) => {
      if (i.vibe && !tags.includes(i.vibe)) tags.push(i.vibe);
    });
    return tags.slice(0, 4);
  }, [suggestion, matchedItems, layers, footwear]);

  // Auto-select first owned item in each category when results arrive
  useEffect(() => {
    if (!suggestion) return;
    const findFirstOwned = (items) => {
      const found = items.find((i) => {
        const n = i.name || i.subcategory || i.item || "";
        return (wardrobeMatches[n] || []).length > 0;
      });
      return found || (items.length > 0 ? items[0] : null);
    };
    setPicks({
      bottom: selectedItem?.type === "Top" ? findFirstOwned(matchedItems) : null,
      top: selectedItem?.type === "Bottom" ? findFirstOwned(matchedItems) : null,
      layer: findFirstOwned(layers),
      footwear: findFirstOwned(footwear),
    });
  }, [suggestion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first owned item in continued layer/footwear results
  useEffect(() => {
    if (!continuedLayers && !continuedFootwear) return;
    const allWM = { ...wardrobeMatches };
    const findFirstOwned = (items) => {
      const found = items.find((i) => {
        const n = i.name || i.subcategory || i.item || "";
        return (allWM[n] || []).length > 0;
      });
      return found || (items.length > 0 ? items[0] : null);
    };
    setPicks((prev) => ({
      ...prev,
      layer: continuedLayers ? findFirstOwned(continuedLayers.options) : prev.layer,
      footwear: continuedFootwear ? findFirstOwned(continuedFootwear.options) : prev.footwear,
    }));
  }, [continuedLayers, continuedFootwear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve pick → closet item for OutfitFlatLay
  const resolveToClosetItem = (pick) => {
    if (!pick) return null;
    const name = pick.name || pick.subcategory || pick.item || "";
    const owned = (wardrobeMatches[name] || [])[0];
    return owned || null;
  };

  // Build preview items
  const previewTop = selectedItem?.type === "Top" ? selectedItem : resolveToClosetItem(picks.top);
  const previewBottom = selectedItem?.type === "Bottom" ? selectedItem : resolveToClosetItem(picks.bottom);
  const previewLayer = resolveToClosetItem(picks.layer);
  const previewFootwear = resolveToClosetItem(picks.footwear);

  // Color palette from selected items
  const colorPalette = useMemo(() => {
    const palette = [];
    [selectedItem, previewTop, previewBottom, previewLayer, previewFootwear]
      .filter(Boolean)
      .forEach((item) => {
        (item.dominantColors || []).slice(0, 1).forEach((c) => {
          if (c.hex && !palette.find((p) => p.hex === c.hex)) {
            palette.push(c);
          }
        });
      });
    return palette.slice(0, 5);
  }, [selectedItem, previewTop, previewBottom, previewLayer, previewFootwear]);

  const nameToEmoji = (n) => {
    const l = n.toLowerCase();
    if (/shirt|top|kurta|tee|blouse|polo/.test(l)) return "\u{1F455}";
    if (/jean|trouser|pant|chino|short|skirt/.test(l)) return "\u{1F456}";
    if (/jacket|blazer|coat|layer|hoodie|cardigan|sweater/.test(l)) return "\u{1F9E5}";
    if (/shoe|sneaker|boot|loafer|heel|sandal|footwear|slipper/.test(l)) return "\u{1F45F}";
    return "\u{1F454}";
  };

  // Flatten all suggestion items into one bento array
  const bentoItems = useMemo(() => {
    const arr = [];
    const mainCat = selectedItem?.type === "Top" ? "bottom" : "top";
    matchedItems.forEach((item) => arr.push({ item, slotType: mainCat }));
    layers.forEach((item) => arr.push({ item, slotType: "layer" }));
    footwear.forEach((item) => arr.push({ item, slotType: "footwear" }));
    return arr;
  }, [matchedItems, layers, footwear, selectedItem?.type]);

  // Previous mix-match outfits
  const mixMatchOutfits = useMemo(() => {
    if (!savedOutfits?.length) return [];
    return savedOutfits.filter((o) =>
      o.tags?.includes("mix-match") || (o.source === "ai_suggested" && o.tags?.length === 0)
    ).slice(0, 8);
  }, [savedOutfits]);

  // Rich info: build anchor + paired item summary for the info tile
  const pairingInfo = useMemo(() => {
    if (!suggestion || !selectedItem) return null;

    const anchorColor = selectedItem.dominantColors?.[0]?.name || "";
    const anchorName = selectedItem.subcategory || selectedItem.type || "";

    // Get the selected paired item info
    const mainPick = selectedItem.type === "Top" ? picks.bottom : picks.top;
    const pairedName = mainPick?.name || mainPick?.subcategory || mainPick?.item || "";
    const pairedColor = mainPick?.color || mainPick?.shade || "";
    const pairedOwned = resolveToClosetItem(mainPick);
    const pairedOwnedColor = pairedOwned?.dominantColors?.[0]?.name || pairedColor;

    return {
      anchorName,
      anchorColor,
      pairedName,
      pairedColor: pairedOwnedColor,
      stylingTip: suggestion.stylingTip || "",
      overallVibe: suggestion.overallVibe || "",
    };
  }, [suggestion, selectedItem, picks, wardrobeMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredClosetItems = closetItems.filter((item) => {
    if (filterTab === "All") return item.type === "Top" || item.type === "Bottom";
    return item.type === filterTab;
  });

  const resetContinueState = () => {
    setContinuedLayers(null);
    setContinuedFootwear(null);
    setShowLayers(false);
    setShowFootwear(false);
    setNudge(null);
  };

  const handleItemSelect = (item) => {
    setSelectedItem((prev) => prev?._id === item._id ? null : item);
    if (suggestion) dispatch(clearSuggestion());
    setPicks({ bottom: null, layer: null, footwear: null, top: null });
    resetContinueState();
  };

  const handleSuggest = () => {
    if (!selectedItem || !occasion || !season) return;
    resetContinueState();
    const params = { clothingItemId: selectedItem._id, occasion, season };
    if (description.trim()) params.description = description.trim();
    dispatch(fetchSuggestionThunk("from-item", params));
  };

  /* ── Extract response helper (both endpoints return same flat shape) ── */
  const extractContinueData = (res) => {
    // makeRequest returns response.data → { data: { success, data: payload }, error, statusCode }
    if (!res.data?.success || !res.data.data) return null;
    const d = res.data.data;
    return {
      options: d.options || [],
      wardrobeMatches: d.wardrobeMatches || {},
      productRecommendations: d.productRecommendations || {},
    };
  };

  /* ── Fetch layers only (silently pre-fetches footwear too) ── */
  const handleGetLayers = async () => {
    if (!selectedItem || selectedItem.type !== "Top") return;
    setLayerLoading(true);
    setShowLayers(true);
    try {
      const pickedBottom = resolveToClosetItem(picks.bottom);
      // Fire both in parallel — show layers immediately, cache footwear for nudge
      const calls = [
        makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.SUGGEST_LAYER, {
          clothingItemId: selectedItem._id, occasion, season,
        }),
      ];
      if (pickedBottom?._id) {
        calls.push(
          makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.SUGGEST_FOOTWEAR, {
            topItemId: selectedItem._id, bottomItemId: pickedBottom._id, occasion, season,
          })
        );
      }
      const results = await Promise.all(calls);

      const layerData = extractContinueData(results[0]);
      if (layerData) setContinuedLayers(layerData);

      if (results[1]) {
        const fwData = extractContinueData(results[1]);
        if (fwData) setContinuedFootwear(fwData);
        // Nudge for footwear (pre-fetched but not shown)
        if (fwData?.options.length > 0) setNudge({ type: "footwear" });
      }
    } catch (err) {
      console.error("Layer fetch error:", err);
    } finally {
      setLayerLoading(false);
    }
  };

  /* ── Fetch footwear only (silently pre-fetches layers too) ── */
  const handleGetFootwear = async () => {
    if (!selectedItem || selectedItem.type !== "Top") return;
    const pickedBottom = resolveToClosetItem(picks.bottom);
    if (!pickedBottom?._id) return;
    setFootwearLoading(true);
    setShowFootwear(true);
    try {
      // Fire both in parallel — show footwear immediately, cache layers for nudge
      const [fwRes, layerRes] = await Promise.all([
        makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.SUGGEST_FOOTWEAR, {
          topItemId: selectedItem._id, bottomItemId: pickedBottom._id, occasion, season,
        }),
        makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.SUGGEST_LAYER, {
          clothingItemId: selectedItem._id, occasion, season,
        }),
      ]);

      const fwData = extractContinueData(fwRes);
      if (fwData) setContinuedFootwear(fwData);

      const layerData = extractContinueData(layerRes);
      if (layerData) setContinuedLayers(layerData);
      // Nudge for layers (pre-fetched but not shown)
      if (layerData?.options.length > 0) setNudge({ type: "layer" });
    } catch (err) {
      console.error("Footwear fetch error:", err);
    } finally {
      setFootwearLoading(false);
    }
  };

  /* ── Accept nudge: reveal the pre-fetched other category ── */
  const handleAcceptNudge = () => {
    if (nudge?.type === "layer") setShowLayers(true);
    if (nudge?.type === "footwear") setShowFootwear(true);
    setNudge(null);
  };

  // Can the user continue? (need a picked bottom that resolves to an owned item)
  const canContinue = selectedItem?.type === "Top" && resolveToClosetItem(picks.bottom)?._id;

  const handlePickSelect = (category, item) => {
    setPicks((prev) => ({
      ...prev,
      [category]: prev[category] === item ? null : item,
    }));
  };

  const handleOpenSave = () => {
    setSaveName(`Mix: ${selectedItem?.subcategory || "Outfit"}`);
    setShowSavePrompt(true);
  };

  const handleSaveOutfit = async () => {
    const itemIds = [selectedItem?._id].filter(Boolean);

    // Add picked owned items
    [picks.top, picks.bottom, picks.layer, picks.footwear].forEach((pick) => {
      const resolved = resolveToClosetItem(pick);
      if (resolved?._id && !itemIds.includes(resolved._id)) {
        itemIds.push(resolved._id);
      }
    });

    if (itemIds.length < 2) return;

    const outfitData = {
      name: saveName.trim() || `Mix: ${selectedItem?.subcategory || "Outfit"}`,
      itemIds,
      occasion: occasion || undefined,
      season: season || undefined,
      tags: ["mix-match"],
      source: "ai_suggested",
    };

    setShowSavePrompt(false);
    const res = await dispatch(saveOutfitThunk(outfitData));
    if (res?.data?._id) navigate(`/wardrobe/outfits/${res.data._id}`);
  };

  const handleExpandImage = (item, ownedMatch) => {
    if (ownedMatch?.photoUrl) {
      setLightboxData({ src: ownedMatch.photoUrl, alt: item.name || item.subcategory, item: ownedMatch });
    }
  };

  const anchorImgSrc = selectedItem?.nobgUrl || selectedItem?.thumbnailUrl || selectedItem?.photoUrl;

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-3 sm:px-4 pt-2 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => {
            if (suggestion) {
              dispatch(clearSuggestion());
              setPicks({ bottom: null, layer: null, footwear: null, top: null });
              resetContinueState();
            } else if (selectedItem) {
              setSelectedItem(null);
            } else {
              navigate("/wardrobe");
            }
          }} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-base font-bold dark:text-dark-text text-light-text">Mix & Match</h2>
        </div>
        <p className="text-[10px] mt-1 dark:text-dark-text/40 text-light-text/40 leading-relaxed">
          Pick a piece, get matching suggestions, build your outfit step by step
        </p>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 py-3 space-y-4">

        {/* ══════ PREVIOUS MIX-MATCH CREATIONS ══════ */}
        {mixMatchOutfits.length > 0 && !suggestion && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider dark:text-dark-text/50 text-light-text/50 mb-2">
              Your Creations
            </h3>
            <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
              {mixMatchOutfits.map((outfit) => (
                <div key={outfit._id} className="flex-shrink-0 w-[130px]">
                  <OutfitCard
                    outfit={outfit}
                    onClick={(o) => navigate(`/wardrobe/outfits/${o._id}`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ ANCHOR CARD ══════ */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            borderColor: toRgba(colors.fourth, 0.25),
            background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.06)}, transparent)`,
          }}
        >
          <div className="flex gap-3 p-3">
            {/* Item picker strip */}
            {!selectedItem ? (
              <div className="w-full">
                <p className="text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
                  Pick a Top or Bottom from your closet
                </p>
                {/* Filter tabs */}
                <div className="flex gap-2 mb-2.5">
                  {FILTER_TABS.map((tab) => {
                    const isActive = filterTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setFilterTab(tab)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all
                          ${isActive ? "text-white" : "dark:text-dark-text/60 text-light-text/60"}`}
                        style={{
                          backgroundColor: isActive ? colors.fourth : "transparent",
                          borderColor: isActive ? colors.fourth : toRgba(colors.fourth, 0.3),
                        }}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
                {/* Items row */}
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {filteredClosetItems.map((item) => {
                    const hasPhoto = item.photoUrl && item.photoUrl !== "placeholder";
                    return (
                      <button
                        key={item._id}
                        onClick={() => handleItemSelect(item)}
                        className="flex-shrink-0 w-20 rounded-lg border p-1 text-center transition-all hover:shadow-md"
                        style={{ borderColor: toRgba(colors.fourth, 0.2) }}
                      >
                        {hasPhoto ? (
                          <img src={item.thumbnailUrl || item.photoUrl} alt={item.subcategory} className="w-full h-20 object-cover rounded" />
                        ) : (
                          <div className="w-full h-20 rounded flex items-center justify-center text-lg" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
                            {item.type === "Top" ? "\u{1F455}" : "\u{1F456}"}
                          </div>
                        )}
                        <p className="text-[9px] mt-1 dark:text-dark-text/60 text-light-text/60 truncate">{item.subcategory}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Anchor image */}
                <div className="relative flex-shrink-0 w-28 h-32 rounded-lg overflow-hidden group">
                  {anchorImgSrc ? (
                    <img src={anchorImgSrc} alt={selectedItem.subcategory}
                      className="w-full h-full object-cover"
                      style={selectedItem.nobgUrl ? { objectFit: "contain", backgroundColor: "#f5f5f0" } : {}}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
                      {selectedItem.type === "Top" ? "\u{1F455}" : "\u{1F456}"}
                    </div>
                  )}
                  {/* Deselect */}
                  <button
                    onClick={() => handleItemSelect(selectedItem)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.85) }}
                  >
                    <Close style={{ fontSize: 12 }} />
                  </button>
                </div>

                {/* Anchor info + controls */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-bold dark:text-dark-text text-light-text truncate">
                      {selectedItem.subcategory}
                    </p>
                    <p className="text-[11px] dark:text-dark-text/50 text-light-text/50 mt-0.5">
                      {selectedItem.type}
                      {selectedItem.dominantColors?.[0]?.name && ` \u00B7 ${selectedItem.dominantColors[0].name}`}
                      {selectedItem.pattern && ` \u00B7 ${selectedItem.pattern}`}
                    </p>
                    {/* Auto-defaults hint */}
                    {defaultsApplied && (
                      <p className="text-[9px] mt-1 inline-flex items-center gap-0.5 animate-pulse w-fit" style={{ color: colors.fourth }}>
                        <InfoOutlined style={{ fontSize: 10 }} />
                        Pre-filled from your style profile
                      </p>
                    )}
                  </div>

                  <div className="flex items-end gap-2 mt-2">
                    <div className="flex-1 min-w-0">
                      <OccasionSeasonPicker
                        occasion={occasion} season={season}
                        onOccasionChange={setOccasion} onSeasonChange={setSeason}
                        compact
                      />
                    </div>
                    <button
                      onClick={handleSuggest}
                      disabled={!occasion || !season || loading}
                      className="flex-shrink-0 px-3 py-[7px] rounded-lg text-[11px] font-semibold text-white flex items-center gap-1
                        transition-all hover:opacity-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.fourth }}
                    >
                      {loading ? <CircularProgress size={10} style={{ color: "white" }} /> : <AutoAwesome style={{ fontSize: 12 }} />}
                      Match It
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Optional description */}
          {selectedItem && (
            <div className="px-3 pb-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you're looking for... (optional)"
                rows={1}
                className="w-full px-2.5 py-1.5 rounded-lg border text-xs dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none focus:ring-1 transition-all resize-none"
                style={{ borderColor: toRgba(colors.fourth, 0.2), outlineColor: colors.fourth }}
              />
            </div>
          )}
        </div>

        {/* ══════ ERROR ══════ */}
        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ══════ LOADING ══════ */}
        {loading && !suggestion && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
              <p className="text-xs font-medium dark:text-dark-text/50 text-light-text/50 mb-3 flex items-center gap-1.5">
                <AutoAwesome style={{ fontSize: 14, color: colors.fourth }} />
                Finding matches for {selectedItem?.subcategory}...
              </p>
              <GridSkeleton colors={colors} />
            </div>
          </div>
        )}

        {/* ── Empty state — waiting for first search ── */}
        {selectedItem && !suggestion && !loading && !error && (
          <div className="rounded-xl border border-dashed p-8 flex flex-col items-center gap-2 text-center"
            style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
            <AutoAwesome style={{ fontSize: 28, color: toRgba(colors.fourth, 0.3) }} />
            <p className="text-xs dark:text-dark-text/40 text-light-text/40">
              Pick occasion & season, then tap{" "}
              <span className="font-semibold" style={{ color: colors.fourth }}>Match It</span>{" "}
              to get styled suggestions
            </p>
          </div>
        )}

        {/* ══════ RESULTS — BENTO ══════ */}
        {suggestion && hasResults && (
          <div className="space-y-3">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] dark:text-dark-text/50 text-light-text/50">
                Tap to pick, preview updates live
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSuggest}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all hover:shadow-sm disabled:opacity-40"
                  style={{ borderColor: toRgba(colors.fourth, 0.3), color: colors.fourth }}
                >
                  <ShuffleOutlined style={{ fontSize: 12 }} />
                  Shuffle
                </button>
                <button
                  onClick={handleOpenSave}
                  disabled={saving || !previewTop || !previewBottom}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: colors.fourth }}
                >
                  {saving ? <CircularProgress size={10} style={{ color: "white" }} /> : <Save style={{ fontSize: 12 }} />}
                  Save
                </button>
              </div>
            </div>

            {/* ── Bento Grid ── */}
            <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[140px] gap-2.5">

              {/* Hero: Flat-lay preview — 2 cols x 2 rows */}
              <div
                className="col-span-2 row-span-2 rounded-2xl overflow-hidden relative flex items-center justify-center"
                style={{ backgroundColor: "#f5f5f0" }}
              >
                {(previewTop || previewBottom) ? (
                  <>
                    <OutfitFlatLay
                      top={previewMode === "photos" ? { ...previewTop, nobgUrl: undefined, photoUrl: previewTop?.thumbnailUrl || previewTop?.photoUrl } : previewTop}
                      bottom={previewMode === "photos" ? { ...previewBottom, nobgUrl: undefined, photoUrl: previewBottom?.thumbnailUrl || previewBottom?.photoUrl } : previewBottom}
                      layer={previewMode === "photos" && previewLayer ? { ...previewLayer, nobgUrl: undefined, photoUrl: previewLayer?.thumbnailUrl || previewLayer?.photoUrl } : previewLayer}
                      footwear={previewMode === "photos" && previewFootwear ? { ...previewFootwear, nobgUrl: undefined, photoUrl: previewFootwear?.thumbnailUrl || previewFootwear?.photoUrl } : previewFootwear}
                      size="lg"
                    />

                    {/* Toggle: flat-lay ↔ photos */}
                    <button
                      onClick={() => setPreviewMode((m) => m === "flatlay" ? "photos" : "flatlay")}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm text-white/80 hover:bg-black/50 transition-colors"
                      title={previewMode === "flatlay" ? "Show photos" : "Show flat-lay"}
                    >
                      {previewMode === "flatlay" ? (
                        <PhotoOutlined style={{ fontSize: 13 }} />
                      ) : (
                        <AutoAwesome style={{ fontSize: 13 }} />
                      )}
                    </button>
                  </>
                ) : (
                  <p className="text-[11px] text-light-text/40 text-center px-4">
                    Select items to see outfit preview
                  </p>
                )}
              </div>

              {/* ── Rich Info Tile — outfit breakdown ── */}
              {pairingInfo && (
                <div
                  className="col-span-1 sm:col-span-2 row-span-2 rounded-2xl border p-3 flex flex-col justify-between overflow-hidden"
                  style={{
                    borderColor: toRgba(colors.fourth, 0.2),
                    background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.06)}, transparent)`,
                  }}
                >
                  {/* Anchor item info */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider font-bold dark:text-dark-text/35 text-light-text/35">
                        Anchor
                      </span>
                      <p className="text-[11px] font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
                        {pairingInfo.anchorName}
                      </p>
                      {pairingInfo.anchorColor && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {selectedItem?.dominantColors?.[0]?.hex && (
                            <div className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                              style={{ backgroundColor: selectedItem.dominantColors[0].hex }} />
                          )}
                          <span className="text-[9px] dark:text-dark-text/45 text-light-text/45">
                            {pairingInfo.anchorColor}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Paired item info */}
                    {pairingInfo.pairedName && (
                      <div>
                        <span className="text-[8px] uppercase tracking-wider font-bold dark:text-dark-text/35 text-light-text/35">
                          Paired {selectedItem?.type === "Top" ? "Bottom" : "Top"}
                        </span>
                        <p className="text-[11px] font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
                          {pairingInfo.pairedName}
                        </p>
                        {pairingInfo.pairedColor && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {resolveToClosetItem(selectedItem?.type === "Top" ? picks.bottom : picks.top)?.dominantColors?.[0]?.hex && (
                              <div className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                                style={{ backgroundColor: resolveToClosetItem(selectedItem?.type === "Top" ? picks.bottom : picks.top).dominantColors[0].hex }} />
                            )}
                            <span className="text-[9px] dark:text-dark-text/45 text-light-text/45">
                              {pairingInfo.pairedColor}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vibe tags */}
                  {vibeTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vibeTags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[8px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Styling tip */}
                  {pairingInfo.stylingTip && (
                    <p className="text-[9px] dark:text-dark-text/40 text-light-text/40 mt-2 line-clamp-3 leading-relaxed italic">
                      &ldquo;{pairingInfo.stylingTip}&rdquo;
                    </p>
                  )}

                  {/* Color palette */}
                  {colorPalette.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {colorPalette.map((c, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                          title={c.name}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Item bento cards ── */}
              {bentoItems.map(({ item, slotType }, idx) => {
                const itemName = item.name || item.subcategory || item.item || "Item";
                const ownedList = wardrobeMatches[itemName] || [];
                const ownedMatch = ownedList[0] || null;
                const productList = productRecommendations[itemName] || [];
                const productRec = productList[0] || null;
                const photoSrc = ownedMatch?.thumbnailUrl || ownedMatch?.photoUrl || productRec?.image || productRec?.imageUrl || null;
                const isSelected = picks[slotType] === item;
                const catLabel = slotType === "bottom" ? "Bottom" : slotType === "top" ? "Top" : slotType === "layer" ? "Layer" : "Shoes";
                const isShoppable = !ownedMatch && productRec?.link;

                const cardContent = (
                  <>
                    {/* Image */}
                    {photoSrc ? (
                      <img src={photoSrc} alt={itemName} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-1"
                        style={{ backgroundColor: toRgba(colors.fourth, 0.06) }}
                      >
                        <span className="text-2xl">{nameToEmoji(itemName)}</span>
                        <span className="text-[8px] dark:text-dark-text/30 text-light-text/30 px-2 text-center truncate max-w-full">
                          {item.color || item.shade || ""}
                        </span>
                      </div>
                    )}

                    {/* Bottom gradient: name + category + price */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                      <p className="text-[10px] font-semibold text-white truncate">{itemName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-white/60 uppercase tracking-wider">{catLabel}</span>
                        {isShoppable && productRec.price && (
                          <span className="text-[8px] text-emerald-300 font-medium">
                            {"\u20B9"}{productRec.price}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selected check */}
                    {isSelected && (
                      <div
                        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                        style={{ backgroundColor: colors.fourth }}
                      >
                        <CheckCircleOutline style={{ fontSize: 13, color: "#fff" }} />
                      </div>
                    )}

                    {/* Owned / Shop badge */}
                    <div className="absolute top-1.5 right-1.5">
                      {ownedMatch ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                          <span className="text-[8px] text-white font-bold">{"\u2713"}</span>
                        </div>
                      ) : isShoppable ? (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                          <OpenInNew style={{ fontSize: 8, color: "#fff" }} />
                          <span className="text-[7px] text-white font-semibold">Shop</span>
                        </div>
                      ) : null}
                    </div>
                  </>
                );

                if (isShoppable) {
                  return (
                    <a
                      key={idx}
                      href={productRec.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey) {
                          e.preventDefault();
                          handlePickSelect(slotType, item);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        window.open(productRec.link, "_blank", "noopener,noreferrer");
                      }}
                      className={`col-span-1 rounded-2xl overflow-hidden relative transition-all duration-200 block
                        ${isSelected ? "ring-2 scale-[1.03] shadow-lg z-10" : "hover:shadow-md hover:scale-[1.01]"}`}
                      style={{
                        ringColor: colors.fourth,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.15),
                      }}
                    >
                      {cardContent}
                    </a>
                  );
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePickSelect(slotType, item)}
                    className={`col-span-1 rounded-2xl overflow-hidden relative transition-all duration-200
                      ${isSelected ? "ring-2 scale-[1.03] shadow-lg z-10" : "hover:shadow-md hover:scale-[1.01]"}`}
                    style={{
                      ringColor: colors.fourth,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.15),
                    }}
                  >
                    {cardContent}
                  </button>
                );
              })}
            </div>

            {/* ═══ Nudge toast ═══ */}
            {nudge && (
              <div
                className="rounded-xl border p-2.5 flex items-center justify-between animate-in slide-in-from-bottom-2"
                style={{
                  borderColor: toRgba(colors.fourth, 0.3),
                  background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)}, transparent)`,
                }}
              >
                <p className="text-[10px] dark:text-dark-text/60 text-light-text/60">
                  {nudge.type === "layer"
                    ? "Complete your outfit with a layer?"
                    : "Add matching shoes to finish the look?"}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleAcceptNudge}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    + Add {nudge.type === "layer" ? "Layers" : "Shoes"}
                  </button>
                  <button
                    onClick={() => setNudge(null)}
                    className="w-5 h-5 rounded-full flex items-center justify-center dark:text-dark-text/40 text-light-text/40 hover:dark:text-dark-text/70 hover:text-light-text/70 transition-colors"
                  >
                    <Close style={{ fontSize: 12 }} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══ Continue chips + Reshuffle ═══ */}
            <div
              className="rounded-xl border border-dashed p-3 flex items-center justify-between"
              style={{ borderColor: toRgba(colors.fourth, 0.25) }}
            >
              <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                {canContinue && !showLayers && !showFootwear
                  ? "Build your outfit step by step"
                  : "Not what you had in mind?"}
              </p>
              <div className="flex items-center gap-1.5">
                {/* + Layers chip */}
                {canContinue && !showLayers && (
                  <button
                    onClick={handleGetLayers}
                    disabled={layerLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    {layerLoading ? <CircularProgress size={10} style={{ color: "white" }} /> : "+" }
                    Layers
                  </button>
                )}
                {/* + Shoes chip */}
                {canContinue && !showFootwear && (
                  <button
                    onClick={handleGetFootwear}
                    disabled={footwearLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: colors.fourth }}
                  >
                    {footwearLoading ? <CircularProgress size={10} style={{ color: "white" }} /> : "+"}
                    Shoes
                  </button>
                )}
                {/* Reshuffle */}
                <button
                  onClick={handleSuggest}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:shadow-sm disabled:opacity-40"
                  style={{ borderColor: toRgba(colors.fourth, 0.3), color: colors.fourth }}
                >
                  {loading ? <CircularProgress size={10} style={{ color: colors.fourth }} /> : <ShuffleOutlined style={{ fontSize: 12 }} />}
                  Reshuffle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No results */}
        {suggestion && !hasResults && (
          <div className="rounded-xl border p-6 text-center" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
            <p className="text-sm dark:text-dark-text/50 text-light-text/50">
              No suggestions found. Try a different occasion or season.
            </p>
          </div>
        )}
      </div>

      {/* ── Save name prompt ── */}
      {showSavePrompt && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSavePrompt(false)}
        >
          <div
            className="rounded-2xl p-5 w-[320px] shadow-2xl dark:bg-dark-primary bg-light-secondary border"
            style={{ borderColor: toRgba(colors.fourth, 0.2) }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold dark:text-dark-text text-light-text mb-3">
              Name Your Outfit
            </h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveOutfit()}
              placeholder="e.g. Weekend Casual"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border text-xs dark:bg-dark-primary bg-white dark:text-dark-text text-light-text focus:outline-none focus:ring-1 transition-all"
              style={{ borderColor: toRgba(colors.fourth, 0.3), outlineColor: colors.fourth }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowSavePrompt(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border dark:text-dark-text/60 text-light-text/60 transition-all hover:shadow-sm"
                style={{ borderColor: toRgba(colors.fourth, 0.2) }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutfit}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                style={{ backgroundColor: colors.fourth }}
              >
                {saving ? <CircularProgress size={10} style={{ color: "white" }} /> : <Save style={{ fontSize: 13 }} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxData && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 cursor-pointer"
          onClick={() => setLightboxData(null)}
        >
          <ImageLightbox
            src={lightboxData.src}
            alt={lightboxData.alt}
            onClose={() => setLightboxData(null)}
            item={lightboxData.item}
            scoped
          />
        </div>
      )}
    </div>
  );
}

export default FromItem;
