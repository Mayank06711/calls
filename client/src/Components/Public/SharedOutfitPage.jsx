import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CircularProgress } from "@mui/material";
import { Visibility, ContentCopy, Check, FavoriteBorder, Favorite } from "@mui/icons-material";
import { fetchSharedOutfitThunk, likeSharedOutfitThunk } from "../../redux/thunks/wardrobe.thunks";
import KYFLogo from "../../assets/KYF_Logo.png";

const TYPE_EMOJI = { Top: "👕", Bottom: "👖", "Full Body": "👗", Outerwear: "🧥", Shoes: "👟", Accessory: "⌚" };
const ACCENT = "#059212";

// CSS flat-lay slot positions (mirrors OutfitFlatLay component)
const FLATLAY_SLOTS = {
  layer: { top: "2%", left: "3%", width: "50%", height: "46%", transform: "rotate(-8deg)", zIndex: 1 },
  top: { top: "2%", left: "24%", width: "50%", height: "46%", transform: "rotate(3deg)", zIndex: 2 },
  bottom: { top: "38%", left: "20%", width: "54%", height: "50%", transform: "rotate(-1deg)", zIndex: 3 },
  footwear: { bottom: "2%", right: "5%", width: "34%", height: "20%", zIndex: 4 },
  full_body: { top: "2%", left: "15%", width: "65%", height: "78%", transform: "rotate(1deg)", zIndex: 2 },
};

const TYPE_TO_SLOT = { Top: "top", Bottom: "bottom", Outerwear: "layer", Shoes: "footwear", "Full Body": "full_body" };

// One primary color per item, tagged with the item type
function buildPaletteFromItems(items) {
  const palette = [];
  for (const item of items) {
    const primary = item.dominantColors?.[0];
    if (primary?.hex) {
      palette.push({ ...primary, slot: item.type === "Outerwear" ? "Layer" : item.type });
    }
  }
  return palette;
}

function SharedOutfitPage() {
  const { shareToken } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userId = useSelector((s) => s.auth.userId);

  const [outfit, setOutfit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleLike = useCallback(async () => {
    if (!userId) {
      setShowLoginPrompt(true);
      return;
    }
    if (liking) return;
    setLiking(true);
    // Optimistic update
    setLiked((prev) => !prev);
    setLikeCount((prev) => prev + (liked ? -1 : 1));
    const result = await dispatch(likeSharedOutfitThunk(shareToken));
    setLiking(false);
    if (result?.success) {
      setLiked(result.data.liked);
      setLikeCount(result.data.publicLikes);
    } else {
      // Revert optimistic update
      setLiked((prev) => !prev);
      setLikeCount((prev) => prev + (liked ? 1 : -1));
    }
  }, [liking, liked, shareToken, dispatch, userId]);

  useEffect(() => {
    if (!shareToken) return;
    setLoading(true);
    dispatch(fetchSharedOutfitThunk(shareToken)).then((result) => {
      setLoading(false);
      if (result?.success) {
        setOutfit(result.data);
        setLiked(result.data.hasLiked || false);
        setLikeCount(result.data.publicLikes || 0);
      } else {
        setError(result?.error || "Outfit not found");
      }
    });
  }, [shareToken, dispatch]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <CircularProgress size={28} style={{ color: ACCENT }} />
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4">
        <span className="text-5xl mb-4 opacity-30">👔</span>
        <p className="text-lg font-semibold text-gray-700 mb-2">Outfit not found</p>
        <p className="text-sm text-gray-400 mb-6">This outfit may have been removed or is no longer shared.</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${ACCENT}, #06D001)` }}
        >
          Go to KYF
        </button>
      </div>
    );
  }

  const items = outfit.items || [];
  const SLOT_LABEL = { top: "Top", bottom: "Bottom", layer: "Layer", footwear: "Shoes", full_body: "Full Body" };
  const rawPalette = outfit.colorPalette?.length > 0
    ? outfit.colorPalette.map((c) => ({ ...c, slot: SLOT_LABEL[c.slot] || c.slot }))
    : buildPaletteFromItems(items);
  // Deduplicate by picking first color per slot
  const seenSlots = new Set();
  const palette = rawPalette.filter((c) => {
    if (!c.slot || seenSlots.has(c.slot)) return false;
    seenSlots.add(c.slot);
    return true;
  });
  const creator = outfit.user;
  const previewUrl = outfit.flatlayUrl || outfit.screenshotUrl;

  // Build flat-lay slots from items for CSS fallback
  const flatLayItems = items
    .filter((item) => TYPE_TO_SLOT[item.type])
    .map((item) => ({
      slot: TYPE_TO_SLOT[item.type],
      nobgUrl: item.nobgUrl,
      photoUrl: item.thumbnailUrl,
      type: item.type,
    }));
  const hasAnyImage = flatLayItems.some((i) => i.nobgUrl || i.photoUrl);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Dot grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, ${ACCENT} 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="relative z-30 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={KYFLogo} alt="KYF" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              Know Your Fashion
            </span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${ACCENT}, #06D001)` }}
          >
            {userId ? "Open App" : "Join KYF"}
          </button>
        </div>
      </header>

      {/* ── Main — fills remaining viewport ────────────────────────────── */}
      <main className="relative z-10 flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-5">
        <div className="h-full flex flex-col lg:flex-row gap-3 lg:gap-5">

          {/* ── LEFT: Flat-lay Image (fills height on desktop, auto on mobile) ── */}
          <div className="flex-shrink-0 lg:h-full lg:w-[50%] min-h-0">
            <div
              className="relative h-full rounded-2xl overflow-hidden shadow-lg"
              style={{ backgroundColor: "#f5f5f0" }}
            >
              <div className="w-full aspect-[4/5] lg:aspect-auto lg:h-full flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={outfit.name || "Outfit"}
                    className="w-full h-full object-contain p-3"
                  />
                ) : hasAnyImage ? (
                  <div className="relative w-full h-full">
                    {flatLayItems.map(({ slot, nobgUrl, photoUrl, type }) => {
                      const pos = FLATLAY_SLOTS[slot];
                      if (!pos) return null;
                      if (nobgUrl) {
                        return (
                          <img
                            key={slot}
                            src={nobgUrl}
                            alt={type}
                            className="absolute object-contain"
                            style={{ ...pos, filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.15))" }}
                          />
                        );
                      }
                      if (photoUrl) {
                        return (
                          <div
                            key={slot}
                            className="absolute rounded-lg overflow-hidden shadow-md"
                            style={{ ...pos, border: "2px solid rgba(255,255,255,0.6)" }}
                          >
                            <img src={photoUrl} alt={type} className="w-full h-full object-cover" />
                          </div>
                        );
                      }
                      return (
                        <div
                          key={slot}
                          className="absolute flex items-center justify-center rounded-lg"
                          style={{ ...pos, backgroundColor: "#e8e8e4" }}
                        >
                          <span className="text-2xl">{TYPE_EMOJI[type] || "👔"}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-300">
                    <span className="text-5xl">👔</span>
                    <p className="text-xs mt-2">No preview</p>
                  </div>
                )}
              </div>

              {/* View count */}
              {outfit.viewCount > 0 && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm flex items-center gap-1">
                  <Visibility style={{ fontSize: 11, color: "white" }} />
                  <span className="text-[9px] text-white/80 font-medium">{outfit.viewCount}</span>
                </div>
              )}

              {/* AI badge */}
              {(outfit.source === "ai_suggested" || outfit.source === "engine_suggested" || outfit.source === "ai") && (
                <div
                  className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full backdrop-blur-sm"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}CC, #06D001CC)` }}
                >
                  <span className="text-[8px] font-bold text-white tracking-wide">AI STYLED</span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Bento Data ─────────────────────────────────────── */}
          <div className="flex-1 min-h-0 lg:h-full lg:overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pb-2">

            {/* Title + Creator + Tags */}
            <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-3 sm:p-4">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                {outfit.name || "Untitled Outfit"}
              </h1>
              {creator?.username && (
                <p className="text-[10px] text-gray-400 mt-0.5 mb-2">
                  by <span className="font-medium text-gray-500">@{creator.username}</span>
                </p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap">
                {outfit.occasion && (
                  <span
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}
                  >
                    {outfit.occasion}
                  </span>
                )}
                {outfit.season && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {outfit.season}
                  </span>
                )}
                {outfit.tags?.length > 0 && outfit.tags.map((tag) => (
                  <span key={tag} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 2-col bento: Color Palette + Stats */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Colors — one per item, labeled with type */}
              <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-3">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Palette</p>
                <div className="flex flex-col gap-1.5">
                  {palette.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[9px] text-gray-700 font-medium truncate">{c.name}</span>
                      {c.slot && (
                        <span className="text-[8px] text-gray-400 ml-auto flex-shrink-0">{c.slot}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats + Like + Share */}
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-2.5">
                  <div className="flex-1 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-2.5 flex flex-col items-center justify-center gap-0.5">
                    <p className="text-xl font-bold leading-none" style={{ color: ACCENT }}>{items.length}</p>
                    <p className="text-[8px] text-gray-400">Items</p>
                  </div>
                  <button
                    onClick={handleLike}
                    className="flex-1 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-2.5 flex flex-col items-center justify-center gap-0.5 transition-all hover:shadow-md hover:bg-white/80"
                  >
                    {liked ? (
                      <Favorite style={{ fontSize: 20, color: "#ef4444" }} />
                    ) : (
                      <FavoriteBorder style={{ fontSize: 20, color: "#9ca3af" }} />
                    )}
                    <p className="text-[8px] text-gray-400">{likeCount > 0 ? likeCount : "Like"}</p>
                  </button>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-2.5 flex items-center justify-center gap-1.5 transition-all hover:shadow-md hover:bg-white/80"
                >
                  {copied ? (
                    <Check style={{ fontSize: 14, color: "#22c55e" }} />
                  ) : (
                    <ContentCopy style={{ fontSize: 13, color: ACCENT }} />
                  )}
                  <span className="text-[9px] font-medium" style={{ color: copied ? "#22c55e" : ACCENT }}>
                    {copied ? "Copied!" : "Share Link"}
                  </span>
                </button>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="rounded-2xl bg-white/60 backdrop-blur-sm border border-white/80 shadow-sm p-3 sm:p-4 flex-1 min-h-0">
                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Items</p>
                <div className="space-y-1.5">
                  {items.map((item, i) => {
                    const photo = item.nobgUrl || item.thumbnailUrl;
                    return (
                      <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/80 border border-gray-100">
                        <div
                          className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: "#f5f5f0" }}
                        >
                          {photo ? (
                            <img src={photo} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-sm">{TYPE_EMOJI[item.type] || "👔"}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
                            >
                              {item.type === "Outerwear" ? "Layer" : item.type}
                            </span>
                            <span className="text-[11px] font-medium text-gray-800 truncate">
                              {item.subcategory || item.type}
                            </span>
                          </div>
                          {item.brand && (
                            <span className="text-[9px] text-gray-400">{item.brand}</span>
                          )}
                        </div>
                        {item.dominantColors?.length > 0 && (
                          <div className="flex gap-0.5 flex-shrink-0">
                            {item.dominantColors.slice(0, 2).map((c, ci) => (
                              <div
                                key={ci}
                                className="w-2.5 h-2.5 rounded-full border border-gray-200"
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <div
              className="rounded-2xl p-3 sm:p-4 text-center flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}08, #06D00108)`,
                border: `1px solid ${ACCENT}20`,
              }}
            >
              <p className="text-xs font-semibold text-gray-800 mb-0.5">
                {creator?.username
                  ? `Inspired by @${creator.username}'s look?`
                  : "Want outfits like this?"}
              </p>
              <p className="text-[10px] text-gray-400 mb-2.5">KYF gives you AI styling, expert fashion advice, 949-color analysis, and a digital closet — all free</p>
              <button
                onClick={() => navigate(userId ? "/wardrobe" : "/")}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #06D001)` }}
              >
                {userId ? "Open Wardrobe" : "Get Started Free"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Login prompt popup ─────────────────────────────────────────── */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center">
            <FavoriteBorder style={{ fontSize: 36, color: "#ef4444" }} />
            <p className="text-sm font-semibold text-gray-800 mt-3 mb-1">Sign in to like this outfit</p>
            <p className="text-[11px] text-gray-400 mb-4">Join KYF for AI styling, expert fashion advice, color analysis, and your own digital closet</p>
            <button
              onClick={() => { setShowLoginPrompt(false); navigate("/"); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mb-2 transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #06D001)` }}
            >
              Join KYF — It's Free
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SharedOutfitPage;
