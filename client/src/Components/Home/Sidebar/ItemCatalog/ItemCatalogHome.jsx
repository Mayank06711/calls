import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  AddOutlined,
  SearchOutlined,
  SearchOffOutlined,
  ArrowBack,
} from "@mui/icons-material";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { fetchItemCatalog } from "../../../../redux/thunks/itemCatalog.thunks";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import ItemCatalogCard from "./ItemCatalogCard";

const CATEGORY_TABS = [
  { key: null, label: "All" },
  { key: "clothing", label: "Clothing" },
  { key: "hair", label: "Hair" },
  { key: "makeup", label: "Makeup" },
];

const GENDER_OPTIONS = [
  { key: null, label: "All" },
  { key: "Male", label: "Male" },
  { key: "Female", label: "Female" },
  { key: "Unisex", label: "Unisex" },
];

const ItemCatalogHome = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useSubscriptionColors();

  const { items, pagination } = useSelector((state) => state.itemCatalog?.list || { items: [], pagination: null });
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.ITEM_CATALOG_LIST]);

  const [category, setCategory] = useState(null);
  const [gender, setGender] = useState(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const loadItems = useCallback(() => {
    const filters = { page, limit: 20 };
    if (category) filters.category = category;
    if (gender) filters.gender = gender;
    if (search) filters.search = search;
    dispatch(fetchItemCatalog(filters));
  }, [dispatch, category, gender, search, page]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const handleGenderChange = (g) => {
    setGender(g);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-80 transition-opacity">
                <ArrowBack />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Catalog</h1>
                <p className="text-xs text-white/70">Shared knowledge base for experts</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/item-catalog/create")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <AddOutlined sx={{ fontSize: 18 }} />
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 max-w-5xl mx-auto space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchOutlined
            sx={{ fontSize: 20 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search catalog items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white dark:bg-dark-primary text-gray-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2"
            style={{ focusRingColor: colors.fourth }}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => handleCategoryChange(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === tab.key
                  ? "text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-primary border border-gray-200 dark:border-gray-700"
              }`}
              style={category === tab.key ? { backgroundColor: colors.fourth } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gender Filter */}
        <div className="flex gap-1.5">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.key || "all"}
              onClick={() => handleGenderChange(opt.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                gender === opt.key
                  ? "text-white"
                  : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"
              }`}
              style={gender === opt.key ? { backgroundColor: colors.fourth } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-12">
            <div
              className="inline-block animate-spin rounded-full h-10 w-10 border-b-2"
              style={{ borderColor: colors.fourth }}
            />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading catalog...</p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, i) => (
              <ItemCatalogCard key={item._id} item={item} colors={colors} index={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-16">
            <SearchOffOutlined className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 56 }} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mt-4">
              {search ? "No results found" : "Catalog is empty"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {search
                ? "Try different search terms or filters."
                : "Be the first to add items to the catalog!"}
            </p>
            {!search && (
              <button
                onClick={() => navigate("/item-catalog/create")}
                className="mt-4 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: colors.fourth }}
              >
                Create First Item
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4 pb-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 disabled:opacity-40 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemCatalogHome;
