import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Close, Visibility } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { fetchClosetThunk, fetchSuggestionThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { clearSuggestion } from "../../../../../redux/actions/wardrobe.actions";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import SuggestionCard from "../shared/SuggestionCard";
import ImageLightbox from "../../Wardrobe/MyCloset/ImageLightbox";

const FILTER_TABS = ["All", "Top", "Bottom"];

function SkeletonCards({ count = 4, colors }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="w-full rounded-xl overflow-hidden border animate-pulse"
          style={{ borderColor: toRgba(colors.fourth, 0.2) }}
        >
          <div className="w-full h-32 dark:bg-dark-text/5 bg-light-text/5" />
          <div className="p-2 space-y-2">
            <div className="h-3 rounded dark:bg-dark-text/10 bg-light-text/10 w-3/4" />
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

  const { items: closetItems } = useSelector((state) => state.wardrobe.closet);
  const { loading, result, error } = useSelector((state) => state.wardrobe.suggestions);

  const [selectedItem, setSelectedItem] = useState(null);
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [filterTab, setFilterTab] = useState("All");
  const [lightboxData, setLightboxData] = useState(null);

  useEffect(() => {
    if (closetItems.length === 0) dispatch(fetchClosetThunk());
  }, [dispatch, closetItems.length]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => dispatch(clearSuggestion()), 5000);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  const filteredClosetItems = closetItems.filter((item) => {
    if (filterTab === "All") return item.type === "Top" || item.type === "Bottom";
    return item.type === filterTab;
  });

  const handleItemSelect = (item) => {
    setSelectedItem((prev) => prev?._id === item._id ? null : item);
  };

  const handleSuggest = () => {
    if (!selectedItem || !occasion || !season) return;
    const params = {
      clothingItemId: selectedItem._id,
      occasion,
      season,
    };
    if (description.trim()) params.description = description.trim();
    dispatch(fetchSuggestionThunk("from-item", params));
  };

  const handleExpandImage = (item, ownedMatch) => {
    if (ownedMatch?.photoUrl) {
      setLightboxData({ src: ownedMatch.photoUrl, alt: item.name || item.subcategory, item: ownedMatch });
    }
  };

  const suggestion = result?.suggestion || result;
  const wardrobeMatches = result?.wardrobeMatches || {};
  const productRecommendations = result?.productRecommendations || {};

  const matchedItems = suggestion?.bottom || suggestion?.topSuggestions || [];
  const layers = suggestion?.layers?.options || [];
  const footwear = suggestion?.footwear?.options || [];

  // Pad grid to fill 4 columns with skeleton placeholders
  const GRID_COLS = 4;
  const skeletonCount = (items) => {
    if (items.length === 0) return 0;
    const remainder = items.length % GRID_COLS;
    return remainder === 0 ? 0 : GRID_COLS - remainder;
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center gap-2 pr-12">
          <IconButton onClick={() => { dispatch(clearSuggestion()); navigate("/wardrobe"); }} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
            Mix & Match
          </h2>
        </div>
      </div>

      {/* ── Scrollable Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">

      {/* Occasion + Season + Description */}
      <div
        className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
        style={{ borderColor: toRgba(colors.fourth, 0.3) }}
      >
        <OccasionSeasonPicker
          occasion={occasion}
          season={season}
          onOccasionChange={setOccasion}
          onSeasonChange={setSeason}
        />
        <div className="mt-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you're looking for... (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none focus:ring-2 transition-all resize-none"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          />
        </div>
      </div>

      {/* Item picker */}
      <div
        className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
        style={{ borderColor: toRgba(colors.fourth, 0.3) }}
      >
        <p className="text-xs font-medium mb-2 dark:text-dark-text/60 text-light-text/60">
          Pick a Top or Bottom from your closet
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-3">
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

        {/* Scrollable item row */}
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory custom-scrollbar">
          {filteredClosetItems.map((item) => {
            const isSelected = selectedItem?._id === item._id;
            const hasPhoto = item.photoUrl && item.photoUrl !== "placeholder";
            return (
              <div key={item._id} className="relative flex-shrink-0 w-28 snap-start group">
                <button
                  onClick={() => handleItemSelect(item)}
                  className="w-full rounded-xl border-2 p-1.5 text-center transition-all"
                  style={{
                    borderColor: isSelected ? colors.fourth : "transparent",
                    backgroundColor: isSelected ? toRgba(colors.fourth, 0.1) : undefined,
                  }}
                >
                  {/* Deselect indicator */}
                  {isSelected && (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center z-10 text-white"
                      style={{ backgroundColor: colors.fourth }}
                    >
                      <Close style={{ fontSize: 12 }} />
                    </div>
                  )}
                  {hasPhoto ? (
                    <img src={item.thumbnailUrl || item.photoUrl} alt={item.subcategory} className="w-full h-28 object-cover rounded-lg mb-1" />
                  ) : (
                    <div
                      className="w-full h-28 rounded-lg mb-1 flex items-center justify-center text-xl"
                      style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
                    >
                      {item.type === "Top" ? "👕" : "👖"}
                    </div>
                  )}
                  <p className="text-[10px] dark:text-dark-text/70 text-light-text/70 truncate">
                    {item.subcategory}
                  </p>
                </button>
                {/* Eye button for lightbox */}
                {hasPhoto && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightboxData({ src: item.photoUrl, alt: item.subcategory, item }); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.8) }}
                    title="View larger"
                  >
                    <Visibility style={{ fontSize: 13 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {selectedItem && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleSuggest}
              disabled={!occasion || !season || loading}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: colors.fourth }}
            >
              {loading && <CircularProgress size={14} style={{ color: "white" }} />}
              Suggest Matches
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !suggestion && (
        <div className="space-y-4">
          <div
            className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          >
            <div className="h-4 w-32 rounded dark:bg-dark-text/10 bg-light-text/10 mb-3 animate-pulse" />
            <SkeletonCards colors={colors} />
          </div>
        </div>
      )}

      {/* Results — 4-per-row grid filling parent */}
      {suggestion && (
        <div className="space-y-4">
          {matchedItems.length > 0 && (
            <div
              className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
                Matching {selectedItem?.type === "Top" ? "Bottoms" : "Tops"}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {matchedItems.map((item, idx) => (
                  <SuggestionCard
                    key={idx}
                    item={item}
                    wardrobeMatches={wardrobeMatches}
                    productRecommendations={productRecommendations}
                    onExpand={handleExpandImage}
                    fillParent
                  />
                ))}
                {Array.from({ length: skeletonCount(matchedItems) }).map((_, i) => (
                  <div key={`sk-m-${i}`} className="w-full rounded-xl overflow-hidden border opacity-30" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
                    <div className="w-full h-32 dark:bg-dark-text/5 bg-light-text/5" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 rounded dark:bg-dark-text/8 bg-light-text/8 w-3/4" />
                      <div className="h-2 rounded dark:bg-dark-text/5 bg-light-text/5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {layers.length > 0 && (
            <div
              className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
                Layers
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {layers.map((item, idx) => (
                  <SuggestionCard
                    key={idx}
                    item={item}
                    wardrobeMatches={wardrobeMatches}
                    productRecommendations={productRecommendations}
                    onExpand={handleExpandImage}
                    fillParent
                  />
                ))}
                {Array.from({ length: skeletonCount(layers) }).map((_, i) => (
                  <div key={`sk-l-${i}`} className="w-full rounded-xl overflow-hidden border opacity-30" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
                    <div className="w-full h-32 dark:bg-dark-text/5 bg-light-text/5" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 rounded dark:bg-dark-text/8 bg-light-text/8 w-3/4" />
                      <div className="h-2 rounded dark:bg-dark-text/5 bg-light-text/5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {footwear.length > 0 && (
            <div
              className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
                Footwear
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {footwear.map((item, idx) => (
                  <SuggestionCard
                    key={idx}
                    item={item}
                    wardrobeMatches={wardrobeMatches}
                    productRecommendations={productRecommendations}
                    onExpand={handleExpandImage}
                    fillParent
                  />
                ))}
                {Array.from({ length: skeletonCount(footwear) }).map((_, i) => (
                  <div key={`sk-f-${i}`} className="w-full rounded-xl overflow-hidden border opacity-30" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
                    <div className="w-full h-32 dark:bg-dark-text/5 bg-light-text/5" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 rounded dark:bg-dark-text/8 bg-light-text/8 w-3/4" />
                      <div className="h-2 rounded dark:bg-dark-text/5 bg-light-text/5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedItems.length === 0 && layers.length === 0 && footwear.length === 0 && (
            <div
              className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
              style={{ borderColor: toRgba(colors.fourth, 0.3) }}
            >
              <p className="text-sm dark:text-dark-text/50 text-light-text/50 text-center py-4">
                No suggestions found. Try a different occasion or season.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Scoped lightbox for image expand */}
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
    </div>
  );
}

export default FromItem;
