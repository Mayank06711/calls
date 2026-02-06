import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Refresh, GridView, ViewList } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { fetchSuggestionThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { clearSuggestion } from "../../../../../redux/actions/wardrobe.actions";
import OccasionSeasonPicker from "../shared/OccasionSeasonPicker";
import SuggestionCard from "../shared/SuggestionCard";
import OutfitFlatLay from "../shared/OutfitFlatLay";

const CATEGORIES = [
  { key: "top", label: "Top", emoji: "👕" },
  { key: "bottom", label: "Bottom", emoji: "👖" },
  { key: "layers", label: "Layers", emoji: "🧥" },
  { key: "footwear", label: "Footwear", emoji: "👟" },
];

const TIER_LEVEL = { Free: 0, Silver: 1, Gold: 2, Platinum: 3 };

function FullOutfit() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, result, error } = useSelector((state) => state.wardrobe.suggestions);
  const subscriptionType = useSelector(
    (state) => state.auth.userInfo?.subscription?.type || "Free"
  );
  const isSilverPlus = (TIER_LEVEL[subscriptionType] ?? 0) >= 1;

  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [activeCategories, setActiveCategories] = useState(
    new Set(["top", "bottom", "layers", "footwear"])
  );

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => dispatch(clearSuggestion()), 5000);
      return () => clearTimeout(t);
    }
  }, [error, dispatch]);

  const toggleCategory = (key) => {
    if (!isSilverPlus) return;
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleGenerate = () => {
    if (!occasion || !season) return;
    const params = { occasion, season };
    if (description.trim()) params.description = description.trim();
    dispatch(fetchSuggestionThunk("full-outfit", params));
  };

  const handleShuffle = () => {
    handleGenerate();
  };

  const handleClear = () => {
    dispatch(clearSuggestion());
  };

  // Parse result structure from server
  const suggestion = result?.suggestion || result;
  const wardrobeMatches = result?.wardrobeMatches || {};
  const productRecommendations = result?.productRecommendations || {};

  const topItem = suggestion?.top;
  const bottomItems = suggestion?.bottom || [];
  const layerItems = suggestion?.layers?.options || [];
  const footwearItems = suggestion?.footwear?.options || [];

  const vibeNote = suggestion?.overallVibe || suggestion?.note || suggestion?.stylingTip || "";

  // Primary items for flat-lay (first of each category)
  const primaryBottom = bottomItems[0] || null;
  const primaryLayer = layerItems[0] || null;
  const primaryFootwear = footwearItems[0] || null;

  // Alternative items (extras beyond the first)
  const altLayers = layerItems.slice(1);
  const altFootwear = footwearItems.slice(1);

  return (
    <div className="p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pr-12">
        <div className="flex items-center gap-2">
          <IconButton onClick={() => { handleClear(); navigate("/wardrobe"); }} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
            AI Suggest
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {result && (
            <>
              <IconButton
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                size="small"
                title={viewMode === "grid" ? "List view" : "Grid view"}
              >
                {viewMode === "grid" ? (
                  <ViewList style={{ color: colors.fourth, fontSize: 20 }} />
                ) : (
                  <GridView style={{ color: colors.fourth, fontSize: 20 }} />
                )}
              </IconButton>
              <IconButton onClick={handleShuffle} disabled={loading} size="small">
                <Refresh style={{ color: colors.fourth }} />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div
        className="w-full rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
        style={{ borderColor: `${colors.fourth}30` }}
      >
        <OccasionSeasonPicker
          occasion={occasion}
          season={season}
          onOccasionChange={setOccasion}
          onSeasonChange={setSeason}
        />

        {/* Category chips */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs font-medium dark:text-dark-text/60 text-light-text/60">
              Categories
            </span>
            {!isSilverPlus && (
              <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                (Silver+ to customize)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const active = activeCategories.has(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  disabled={!isSilverPlus}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
                    ${!isSilverPlus ? "cursor-default" : "cursor-pointer"}
                    ${active ? "text-white" : "dark:text-dark-text/60 text-light-text/60"}`}
                  style={{
                    backgroundColor: active ? colors.fourth : `${colors.fourth}15`,
                    borderWidth: 1,
                    borderColor: active ? colors.fourth : `${colors.fourth}30`,
                  }}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description textarea */}
        <div className="mt-3">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you're looking for... (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none focus:ring-2 transition-all resize-none"
            style={{ borderColor: `${colors.fourth}30`, focusRingColor: colors.fourth }}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!occasion || !season || loading}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: colors.fourth }}
          >
            {loading && <CircularProgress size={14} style={{ color: "white" }} />}
            Generate
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Result — Grid (flat-lay) view */}
      {suggestion && viewMode === "grid" && (
        <div className="space-y-4">
          {/* Main flat-lay */}
          <div
            className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
            style={{ borderColor: `${colors.fourth}30` }}
          >
            <div className="flex justify-center">
              <OutfitFlatLay
                top={activeCategories.has("top") ? topItem : null}
                bottom={activeCategories.has("bottom") ? primaryBottom : null}
                layer={activeCategories.has("layers") ? primaryLayer : null}
                footwear={activeCategories.has("footwear") ? primaryFootwear : null}
                flatlayUrl={activeCategories.size === 4 ? suggestion?.flatlayUrl : undefined}
                size="lg"
                showOverlay
                wardrobeMatches={wardrobeMatches}
                productRecommendations={productRecommendations}
              />
            </div>

            {/* Vibe note */}
            {vibeNote && (
              <p className="text-xs dark:text-dark-text/50 text-light-text/50 text-center mt-3 italic leading-relaxed">
                {vibeNote}
              </p>
            )}
          </div>

          {/* Alternatives */}
          {(altLayers.length > 0 || altFootwear.length > 0) && (
            <div
              className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
              style={{ borderColor: `${colors.fourth}30` }}
            >
              <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
                Alternatives
              </h4>

              {activeCategories.has("layers") && altLayers.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium dark:text-dark-text/50 text-light-text/50 mb-2">
                    Layers
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {altLayers.map((item, idx) => (
                      <div key={idx} className="snap-start">
                        <SuggestionCard
                          item={item}
                          wardrobeMatches={wardrobeMatches}
                          productRecommendations={productRecommendations}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeCategories.has("footwear") && altFootwear.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium dark:text-dark-text/50 text-light-text/50 mb-2">
                    Footwear
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {altFootwear.map((item, idx) => (
                      <div key={idx} className="snap-start">
                        <SuggestionCard
                          item={item}
                          wardrobeMatches={wardrobeMatches}
                          productRecommendations={productRecommendations}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result — List view (original sections) */}
      {suggestion && viewMode === "list" && (
        <div className="space-y-4">
          {activeCategories.has("top") && topItem && (
            <OutfitSection
              label="Top"
              items={[topItem]}
              wardrobeMatches={wardrobeMatches}
              productRecommendations={productRecommendations}
              colors={colors}
            />
          )}
          {activeCategories.has("bottom") && bottomItems.length > 0 && (
            <OutfitSection
              label="Bottom"
              items={bottomItems}
              wardrobeMatches={wardrobeMatches}
              productRecommendations={productRecommendations}
              colors={colors}
            />
          )}
          {activeCategories.has("layers") && layerItems.length > 0 && (
            <OutfitSection
              label="Layers"
              items={layerItems}
              wardrobeMatches={wardrobeMatches}
              productRecommendations={productRecommendations}
              colors={colors}
              scrollable
            />
          )}
          {activeCategories.has("footwear") && footwearItems.length > 0 && (
            <OutfitSection
              label="Footwear"
              items={footwearItems}
              wardrobeMatches={wardrobeMatches}
              productRecommendations={productRecommendations}
              colors={colors}
              scrollable
            />
          )}

          {vibeNote && (
            <p className="text-xs dark:text-dark-text/50 text-light-text/50 text-center italic leading-relaxed">
              {vibeNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OutfitSection({ label, items, wardrobeMatches, productRecommendations, colors, scrollable }) {
  return (
    <div
      className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
      style={{ borderColor: `${colors.fourth}30` }}
    >
      <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
        {label}
      </h4>
      <div className={`flex gap-3 ${scrollable ? "overflow-x-auto pb-2 snap-x snap-mandatory" : "flex-wrap"}`}>
        {items.map((item, idx) => (
          <div key={idx} className={scrollable ? "snap-start" : ""}>
            <SuggestionCard
              item={item}
              wardrobeMatches={wardrobeMatches}
              productRecommendations={productRecommendations}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FullOutfit;
