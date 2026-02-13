import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack, Add, GridView, ViewList } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { fetchOutfitsThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import { setOutfitFilters } from "../../../../../redux/actions/wardrobe.actions";
import OutfitCard from "./OutfitCard";
import OutfitListItem from "./OutfitListItem";

function OutfitList() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, saved, filters } = useSelector((s) => s.wardrobe.outfits);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

  useEffect(() => {
    dispatch(fetchOutfitsThunk());
  }, [dispatch]);

  const filtered = saved.filter((o) => {
    if (filters.occasion && o.occasion !== filters.occasion) return false;
    if (filters.season && o.season !== filters.season) return false;
    if (filters.favorite && !o.isFavorite) return false;
    if (filters.source && o.source !== filters.source) return false;
    return true;
  });

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigate("/wardrobe")} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
              My Outfits
            </h2>
            {saved.length > 0 && (
              <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">({filtered.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* View mode toggle */}
            <IconButton
              onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
              size="small"
              title={viewMode === "grid" ? "List view" : "Grid view"}
            >
              {viewMode === "grid" ? (
                <ViewList style={{ color: colors.fourth, fontSize: 20 }} />
              ) : (
                <GridView style={{ color: colors.fourth, fontSize: 20 }} />
              )}
            </IconButton>
            <IconButton onClick={() => navigate("/wardrobe/outfit-builder")} size="small" title="New Outfit">
              <Add style={{ color: colors.fourth }} />
            </IconButton>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="Favorites"
            active={filters.favorite}
            onClick={() => dispatch(setOutfitFilters({ favorite: !filters.favorite, occasion: "" }))}
            colors={colors}
          />
          {["Casual", "Office: Daily Wear", "Party: Night Out", "Date Night", "Wedding"].map((occ) => (
            <FilterChip
              key={occ}
              label={occ}
              active={filters.occasion === occ}
              onClick={() => dispatch(setOutfitFilters({ occasion: filters.occasion === occ ? "" : occ, favorite: false }))}
              colors={colors}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <CircularProgress size={24} style={{ color: colors.fourth }} />
        </div>
      )}

      {/* Grid View */}
      {!loading && filtered.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((outfit) => (
            <OutfitCard
              key={outfit._id}
              outfit={outfit}
              onClick={() => navigate(`/wardrobe/outfits/${outfit._id}`)}
            />
          ))}
          {/* New outfit CTA */}
          <button
            onClick={() => navigate("/wardrobe/outfit-builder")}
            className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 py-12 transition-all hover:shadow-sm"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          >
            <Add style={{ color: colors.fourth, fontSize: 28, opacity: 0.5 }} />
            <span className="text-xs dark:text-dark-text/40 text-light-text/40">New Outfit</span>
          </button>
        </div>
      )}

      {/* List View */}
      {!loading && filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((outfit) => (
            <OutfitListItem
              key={outfit._id}
              outfit={outfit}
              onClick={() => navigate(`/wardrobe/outfits/${outfit._id}`)}
            />
          ))}
          {/* New outfit CTA */}
          <button
            onClick={() => navigate("/wardrobe/outfit-builder")}
            className="w-full rounded-xl border-2 border-dashed flex items-center justify-center gap-2 py-4 transition-all hover:shadow-sm"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          >
            <Add style={{ color: colors.fourth, fontSize: 20, opacity: 0.5 }} />
            <span className="text-xs dark:text-dark-text/40 text-light-text/40">New Outfit</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="text-4xl mb-3 opacity-20">👗</span>
          <p className="text-sm dark:text-dark-text/50 text-light-text/50 mb-4">
            No outfits saved yet
          </p>
          <button
            onClick={() => navigate("/wardrobe/outfit-builder")}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: colors.fourth }}
          >
            Create Your First Outfit
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
        active ? "text-white" : "dark:text-dark-text/60 text-light-text/60"
      }`}
      style={{
        backgroundColor: active ? colors.fourth : toRgba(colors.fourth, 0.1),
        borderWidth: 1,
        borderColor: active ? colors.fourth : toRgba(colors.fourth, 0.2),
      }}
    >
      {label}
    </button>
  );
}

export default OutfitList;
