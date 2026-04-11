import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowBack, Favorite, FavoriteBorder, DeleteOutline, CalendarMonth, Edit, IosShare, Visibility, PersonOutline, LinkOff } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import {
  fetchOutfitsThunk,
  fetchSavedOutfitsThunk,
  toggleOutfitFavoriteThunk,
  deleteOutfitThunk,
  unsaveOutfitThunk,
  logWearThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import OutfitFlatLay from "../shared/OutfitFlatLay";
import { ColorDots, ColorPaletteDetail } from "../shared/ColorDots";
import ShareOutfitModal from "../shared/ShareOutfitModal";
import { useAIContext } from "../../../../../context/AIContext";
import { buildWardrobeBaseContext } from "../../../../../utils/wardrobeAIContext";

const TYPE_EMOJI = { Top: "👕", Bottom: "👖", "Full Body": "👗", Outerwear: "🧥", Shoes: "👟", Accessory: "⌚" };

function OutfitDetail() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { outfitId } = useParams();

  const { saved, savedFromOthers, loading } = useSelector((s) => s.wardrobe.outfits);
  const { logging } = useSelector((s) => s.wardrobe.wearLog);
  const [loggingWear, setLoggingWear] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fetchedSavedRef = useRef(false);

  // ── AI context ──────────────────────────────────────────────────
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const wardrobeState = useSelector((s) => s.wardrobe);
  const outfitForCtx = saved.find((o) => o._id === outfitId) || (savedFromOthers || []).find((o) => o._id === outfitId);
  useEffect(() => {
    const base = buildWardrobeBaseContext(wardrobeState);
    if (!outfitForCtx) {
      setAIPageContext({ page: "wardrobe/outfits/detail", description: `${base} User is viewing an outfit (loading...).` });
      return () => clearAIPageContext();
    }
    const items = (outfitForCtx.items || []).map((i) => {
      const r = i.clothingItem || i;
      const color = r.dominantColors?.[0]?.name || "";
      return `${color ? color + " " : ""}${r.subcategory || r.type}`;
    });
    let desc = `Viewing outfit: "${outfitForCtx.name || "Untitled"}". Items: ${items.join(", ")}.`;
    if (outfitForCtx.occasion) desc += ` Occasion: ${outfitForCtx.occasion}.`;
    if (outfitForCtx.season) desc += ` Season: ${outfitForCtx.season}.`;
    if (outfitForCtx.source) desc += ` Source: ${outfitForCtx.source}.`;
    if (outfitForCtx.tags?.length > 0) desc += ` Tags: ${outfitForCtx.tags.join(", ")}.`;
    if (outfitForCtx.isFavorite) desc += " Favorited.";
    if (outfitForCtx.isPublic) desc += ` Shared (${outfitForCtx.viewCount || 0} views, ${outfitForCtx.publicLikes || 0} likes).`;
    if (outfitForCtx.notes) desc += ` Notes: "${outfitForCtx.notes}".`;
    setAIPageContext({ page: "wardrobe/outfits/detail", description: `${base} ${desc}` });
    return () => clearAIPageContext();
  }, [outfitForCtx?._id, outfitForCtx?.isFavorite, wardrobeState.closet?.items?.length, setAIPageContext, clearAIPageContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset ref when outfitId changes (navigating to a different outfit)
  useEffect(() => {
    fetchedSavedRef.current = false;
  }, [outfitId]);

  useEffect(() => {
    if (saved.length === 0) dispatch(fetchOutfitsThunk());
  }, [dispatch, saved.length]);

  // If outfit not in saved, try savedFromOthers — only once per outfitId
  useEffect(() => {
    if (fetchedSavedRef.current || loading) return;
    const inSaved = saved.find((o) => o._id === outfitId);
    const inOthers = (savedFromOthers || []).find((o) => o._id === outfitId);
    if (!inSaved && !inOthers) {
      fetchedSavedRef.current = true;
      dispatch(fetchSavedOutfitsThunk());
    }
  }, [dispatch, outfitId, saved, savedFromOthers, loading]);

  const outfit = saved.find((o) => o._id === outfitId) || (savedFromOthers || []).find((o) => o._id === outfitId);
  const isFromOther = !saved.find((o) => o._id === outfitId) && !!outfit;

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
  const fullBodyItem = items.find((i) => (i.clothingItem?.type || i.type) === "Full Body");
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

  const handleUnsave = async () => {
    await dispatch(unsaveOutfitThunk(outfit._id));
    navigate("/wardrobe/outfits");
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pl-2 pr-12 sm:pl-4 sm:pr-14 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <IconButton onClick={() => navigate(-1)} size="small" className="flex-shrink-0">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text truncate">
              {outfit.name || "Untitled Outfit"}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <IconButton onClick={() => setShareOpen(true)} size="small">
              <IosShare style={{ fontSize: 20, color: colors.fourth }} />
            </IconButton>
            <IconButton onClick={() => dispatch(toggleOutfitFavoriteThunk(outfit._id))} size="small">
              {outfit.isFavorite ? (
                <Favorite style={{ color: "#ef4444", fontSize: 20 }} />
              ) : (
                <FavoriteBorder style={{ fontSize: 20 }} className="dark:text-dark-text/40 text-light-text/40" />
              )}
            </IconButton>
            {isFromOther ? (
              <IconButton onClick={handleUnsave} size="small" title="Remove from saved">
                <LinkOff style={{ fontSize: 20 }} className="dark:text-dark-text/40 text-light-text/40" />
              </IconButton>
            ) : (
              <IconButton onClick={handleDelete} size="small">
                <DeleteOutline style={{ fontSize: 20 }} className="dark:text-dark-text/40 text-light-text/40" />
              </IconButton>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start">

          {/* Left: Flat-lay image */}
          <div
            className="relative w-full sm:w-80 flex-shrink-0 rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#f5f5f0" }}
          >
            <div className="aspect-[4/5]">
              {outfit.flatlayUrl ? (
                <img
                  src={outfit.flatlayUrl}
                  alt={outfit.name || "Outfit"}
                  className="w-full h-full object-contain p-3"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3">
                  <OutfitFlatLay
                    top={resolveItem(topItem)}
                    bottom={resolveItem(bottomItem)}
                    fullBody={resolveItem(fullBodyItem)}
                    layer={resolveItem(layerItem)}
                    footwear={resolveItem(footwearItem)}
                    size="lg"
                  />
                </div>
              )}
            </div>

            {/* Color palette strip */}
            {outfit.colorPalette?.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 flex" style={{ height: 4 }}>
                {outfit.colorPalette.map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c.hex }} />
                ))}
              </div>
            )}

            {/* Source badge */}
            {(outfit.source === "ai_suggested" || outfit.source === "engine_suggested" || outfit.source === "ai") && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                <span className="text-[9px] font-semibold text-white/80 tracking-wide">AI</span>
              </div>
            )}
            {outfit.source && outfit.source !== "ai_suggested" && outfit.source !== "engine_suggested" && outfit.source !== "ai" && (
              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm">
                <span className="text-[9px] font-medium text-white/70">
                  {outfit.source === "builder-slots" ? "Slots" : "Builder"}
                </span>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="flex-1 min-w-0 py-1">
            {/* Creator badge (saved from others) */}
            {isFromOther && outfit.user && (
              <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}>
                <PersonOutline style={{ fontSize: 14, color: colors.fourth }} />
                <span className="text-[10px] dark:text-dark-text/60 text-light-text/60">
                  by <span className="font-medium" style={{ color: colors.fourth }}>{outfit.user.fullName || outfit.user.username || "Someone"}</span>
                </span>
              </div>
            )}

            {/* Metadata pills */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {outfit.occasion && (
                <span
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.15), color: colors.fourth }}
                >
                  {outfit.occasion}
                </span>
              )}
              {outfit.season && (
                <span
                  className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}
                >
                  {outfit.season}
                </span>
              )}
              {outfit.tags?.filter((t) => t !== "ai-generated").map((tag, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full dark:bg-dark-secondary bg-gray-100 dark:text-dark-text/50 text-light-text/50">
                  {tag}
                </span>
              ))}
            </div>

            {/* Public engagement stats (only when shared) */}
            {outfit.isPublic && (outfit.viewCount > 0 || outfit.publicLikes > 0) && (
              <div className="flex items-center gap-3 mb-3">
                {outfit.viewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Visibility style={{ fontSize: 13 }} className="dark:text-dark-text/40 text-light-text/40" />
                    <span className="text-[10px] dark:text-dark-text/50 text-light-text/50">
                      {outfit.viewCount} {outfit.viewCount === 1 ? "view" : "views"}
                    </span>
                  </div>
                )}
                {outfit.publicLikes > 0 && (
                  <div className="flex items-center gap-1">
                    <Favorite style={{ fontSize: 13, color: "#ef4444" }} />
                    <span className="text-[10px] dark:text-dark-text/50 text-light-text/50">
                      {outfit.publicLikes} {outfit.publicLikes === 1 ? "like" : "likes"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {outfit.createdAt && (
              <p className="text-[10px] dark:text-dark-text/35 text-light-text/35 mb-3">
                Created {new Date(outfit.createdAt).toLocaleDateString()}
              </p>
            )}

            {/* Notes */}
            {outfit.notes && (
              <p className="text-[11px] dark:text-dark-text/50 text-light-text/50 italic leading-relaxed mb-3">
                {outfit.notes}
              </p>
            )}

            {/* Color palette detail */}
            {outfit.colorPalette?.length > 0 && (
              <div className="mb-4">
                <ColorPaletteDetail palette={outfit.colorPalette} />
              </div>
            )}

            {/* Item list */}
            <div className="space-y-1.5 mb-4">
              {[
                { item: topItem, type: "Top" },
                { item: bottomItem, type: "Bottom" },
                { item: fullBodyItem, type: "Full Body" },
                { item: layerItem, type: "Outerwear" },
                { item: footwearItem, type: "Shoes" },
              ]
                .filter(({ item }) => item)
                .concat(
                  items
                    .filter((i) => (i.clothingItem?.type || i.type) === "Accessory")
                    .map((i) => ({ item: i, type: "Accessory" }))
                )
                .map(({ item, type }) => {
                  const resolved = resolveItem(item);
                  const photo = resolved?.nobgUrl || resolved?.thumbnailUrl || resolved?.photoUrl;
                  const name = resolved?.subcategory || resolved?.name || resolved?.item || "Unknown";

                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2.5 rounded-xl border p-2 transition-all hover:shadow-sm"
                      style={{ borderColor: toRgba(colors.fourth, 0.12) }}
                    >
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: "#f5f5f0" }}
                      >
                        {photo ? (
                          <img src={photo} alt={name} className="w-full h-full object-contain p-1" loading="lazy" />
                        ) : (
                          <span className="text-xl">{TYPE_EMOJI[resolved?.type || type] || "👔"}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: toRgba(colors.fourth, 0.12), color: colors.fourth }}
                          >
                            {type === "Outerwear" ? "Layer" : type}
                          </span>
                          <p className="text-xs font-medium dark:text-dark-text/85 text-light-text/85 truncate">
                            {name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {resolved?.dominantColors && (
                            <ColorDots colors={resolved.dominantColors} max={3} size="sm" />
                          )}
                          {(resolved?.dominantColors?.[0]?.name || resolved?.color) && (
                            <span className="text-[9px] dark:text-dark-text/45 text-light-text/45 truncate">
                              {resolved.dominantColors?.[0]?.name || resolved.color}
                            </span>
                          )}
                          {resolved?.brand && (
                            <>
                              <span className="text-[9px] dark:text-dark-text/20 text-light-text/20">·</span>
                              <span className="text-[9px] dark:text-dark-text/45 text-light-text/45 truncate">{resolved.brand}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Actions */}
            {!isFromOther && (
              <div className="flex gap-2.5">
                <button
                  onClick={handleLogWear}
                  disabled={loggingWear || logging}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: colors.fourth }}
                >
                  {(loggingWear || logging) ? <CircularProgress size={14} style={{ color: "white" }} /> : <CalendarMonth style={{ fontSize: 16 }} />}
                  Log as Worn
                </button>
                <button
                  onClick={() => navigate("/wardrobe/outfit-builder", { state: { editOutfit: outfit } })}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium border flex items-center gap-2 dark:text-dark-text/70 text-light-text/70 transition-opacity hover:opacity-70"
                  style={{ borderColor: toRgba(colors.fourth, 0.3) }}
                >
                  <Edit style={{ fontSize: 16 }} />
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isFromOther && <ShareOutfitModal open={shareOpen} onClose={() => setShareOpen(false)} outfit={outfit} />}
    </div>
  );
}

export default OutfitDetail;
