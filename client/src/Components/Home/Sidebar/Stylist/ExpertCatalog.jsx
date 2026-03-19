import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowBack,
  PeopleOutlined,
  SortOutlined,
  SearchOffOutlined,
} from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  useSubscriptionColors,
  toRgba,
} from "../../../../utils/getSubscriptionColors";
import { fetchExpertCatalog } from "../../../../redux/thunks/expert.thunks";
import { setExpertCatalogFilters } from "../../../../redux/actions/expert.actions";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import ExpertCard from "./ExpertCard";

const CATEGORIES = [
  { key: null, label: "All" },
  { key: "clothing", label: "Clothing" },
  { key: "hair", label: "Hair" },
  { key: "makeup", label: "Makeup" },
  { key: "wedding", label: "Wedding" },
  { key: "makeover", label: "Makeover" },
];

const SORT_OPTIONS = [
  { key: "rating", label: "Best Rated" },
  { key: "price_low", label: "Price: Low" },
  { key: "price_high", label: "Price: High" },
  { key: "experience", label: "Experience" },
];

function ExpertCatalog() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const { catalog, filters } = useSelector((s) => s.expertCatalog);
  const isLoading = useSelector(
    (s) => s.loaderState.loaders[LOADER_TYPES.EXPERT_CATALOG]
  );

  // Read initial category from URL query
  const urlCategory = searchParams.get("category");

  useEffect(() => {
    const cat = urlCategory || filters.category;
    if (urlCategory && urlCategory !== filters.category) {
      dispatch(setExpertCatalogFilters({ category: urlCategory }));
    }
    dispatch(fetchExpertCatalog({ category: cat, sort: filters.sort }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (cat) => {
    dispatch(setExpertCatalogFilters({ category: cat }));
    dispatch(fetchExpertCatalog({ category: cat, sort: filters.sort }));
  };

  const handleSortChange = (sort) => {
    dispatch(setExpertCatalogFilters({ sort }));
    dispatch(fetchExpertCatalog({ category: filters.category, sort }));
  };

  const [showSortMenu, setShowSortMenu] = React.useState(false);

  const activeCategory = filters.category;
  const activeSort = filters.sort;
  const experts = catalog.experts || [];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 50%, ${toRgba(colors.fourth, 0.05)} 100%)`,
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.07) }}
        />
        <div className="relative px-4 sm:px-5 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/stylist")}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                boxShadow: `0 3px 10px ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              <ArrowBack style={{ color: "#fff", fontSize: 20 }} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold dark:text-dark-text text-light-text tracking-tight leading-tight">
                  Expert Catalog
                </h2>
                <PeopleOutlined
                  style={{ color: colors.fourth, fontSize: 16 }}
                />
              </div>
              <p className="text-[11px] dark:text-dark-text/40 text-light-text/40 mt-0.5 truncate">
                Browse & connect with certified fashion experts
              </p>
            </div>

            {/* Sort Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                }}
              >
                <SortOutlined
                  style={{ color: colors.fourth, fontSize: 18 }}
                />
              </button>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-10 z-20 min-w-[140px] rounded-lg shadow-lg dark:bg-dark-primary bg-light-secondary py-1"
                  style={{
                    border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        handleSortChange(opt.key);
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        activeSort === opt.key
                          ? "font-semibold"
                          : "dark:text-dark-text/60 text-light-text/60"
                      }`}
                      style={
                        activeSort === opt.key
                          ? { color: colors.fourth }
                          : undefined
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
        <div
          className="h-[2px]"
          style={{
            background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)`,
          }}
        />
      </div>

      {/* ── Category Chips ── */}
      <div className="flex-shrink-0 px-4 sm:px-5 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key || "all"}
              onClick={() => handleCategoryChange(cat.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={
                activeCategory === cat.key
                  ? {
                      backgroundColor: colors.fourth,
                      color: "#fff",
                    }
                  : {
                      backgroundColor: toRgba(colors.fourth, 0.08),
                      color: toRgba(colors.fourth, 0.8),
                    }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expert Grid ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pb-6">
        {isLoading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl p-3.5 animate-pulse dark:bg-dark-primary bg-light-secondary"
                style={{ border: `1px solid ${toRgba(colors.fourth, 0.06)}` }}
              >
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl dark:bg-dark-text/10 bg-light-text/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded dark:bg-dark-text/10 bg-light-text/10" />
                    <div className="h-3 w-16 rounded dark:bg-dark-text/10 bg-light-text/10" />
                    <div className="h-3 w-20 rounded dark:bg-dark-text/10 bg-light-text/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : experts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <SearchOffOutlined
              style={{ color: toRgba(colors.fourth, 0.3), fontSize: 48 }}
            />
            <p className="text-sm dark:text-dark-text/50 text-light-text/50 mt-3">
              No experts found
            </p>
            <p className="text-xs dark:text-dark-text/30 text-light-text/30 mt-1">
              Try a different category
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3 mt-1">
            {experts.map((expert, i) => (
              <ExpertCard
                key={expert.expertId}
                expert={expert}
                colors={colors}
                index={i}
              />
            ))}

            {/* Load More */}
            {catalog.pagination &&
              catalog.pagination.page < catalog.pagination.totalPages && (
                <button
                  onClick={() =>
                    dispatch(
                      fetchExpertCatalog({
                        category: activeCategory,
                        sort: activeSort,
                        page: catalog.pagination.page + 1,
                      })
                    )
                  }
                  className="w-full py-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: toRgba(colors.fourth, 0.08),
                    color: colors.fourth,
                  }}
                >
                  Load More
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpertCatalog;
