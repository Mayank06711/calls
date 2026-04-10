import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowBack,
  EditOutlined,
  DeleteOutlined,
  ChevronLeft,
  ChevronRight,
  SendOutlined,
  ChatBubbleOutlineOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import dayjs from "dayjs";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import {
  fetchItemCatalogDetail,
  deleteCatalogItem,
  addCatalogSuggestion,
} from "../../../../redux/thunks/itemCatalog.thunks";
import { clearItemCatalogDetail } from "../../../../redux/actions/itemCatalog.actions";
import { LOADER_TYPES } from "../../../../redux/action_creators";

const CATEGORY_COLORS = {
  clothing: { bg: "#dbeafe", text: "#1d4ed8" },
  hair: { bg: "#f3e8ff", text: "#7c3aed" },
  makeup: { bg: "#fce7f3", text: "#be185d" },
};

const ItemCatalogDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { itemId } = useParams();
  const colors = useSubscriptionColors();

  const item = useSelector((state) => state.itemCatalog?.detail);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.ITEM_CATALOG_DETAIL]);
  const currentUserId = useSelector((state) => state.auth.userInfo?._id);

  const [imgIndex, setImgIndex] = useState(0);
  const [suggestionText, setSuggestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (itemId) dispatch(fetchItemCatalogDetail(itemId));
    return () => dispatch(clearItemCatalogDetail());
  }, [itemId, dispatch]);

  const isCreator = item?.expert?.user?._id === currentUserId;
  const catColor = CATEGORY_COLORS[item?.category] || CATEGORY_COLORS.clothing;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this catalog item?")) return;
    const success = await dispatch(deleteCatalogItem(itemId));
    if (success) navigate("/item-catalog");
  };

  const handleSuggestion = async () => {
    if (!suggestionText.trim() || submitting) return;
    setSubmitting(true);
    const success = await dispatch(addCatalogSuggestion(itemId, suggestionText.trim()));
    if (success) setSuggestionText("");
    setSubmitting(false);
  };

  if (isLoading || !item) {
    return (
      <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
        <div className="sticky top-0 z-10">
          <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-80">
                <ArrowBack />
              </button>
              <h1 className="text-xl font-semibold text-white">Loading...</h1>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: colors.fourth }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-white hover:opacity-80">
                <ArrowBack />
              </button>
              <h1 className="text-xl font-semibold text-white truncate max-w-xs">{item.title}</h1>
            </div>
            {isCreator && (
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/item-catalog/${itemId}/edit`)}
                  className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <EditOutlined sx={{ fontSize: 18 }} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-lg bg-red-500/20 text-white hover:bg-red-500/30 transition-colors"
                >
                  <DeleteOutlined sx={{ fontSize: 18 }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Image Gallery */}
        <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="relative h-80 bg-gray-100 dark:bg-gray-800">
            <img
              src={item.images[imgIndex]}
              alt={`${item.title} - ${imgIndex + 1}`}
              className="w-full h-full object-contain"
            />
            {item.images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIndex((i) => (i > 0 ? i - 1 : item.images.length - 1))}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronLeft sx={{ fontSize: 20 }} />
                </button>
                <button
                  onClick={() => setImgIndex((i) => (i < item.images.length - 1 ? i + 1 : 0))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronRight sx={{ fontSize: 20 }} />
                </button>
              </>
            )}
            <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
              {imgIndex + 1} / {item.images.length}
            </span>
          </div>
          {/* Thumbnail strip */}
          {item.images.length > 1 && (
            <div className="flex gap-1.5 p-3 overflow-x-auto">
              {item.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  onClick={() => setImgIndex(i)}
                  className={`w-14 h-14 rounded-lg object-cover flex-shrink-0 cursor-pointer border-2 transition-all ${
                    i === imgIndex ? "opacity-100" : "opacity-50 border-transparent"
                  }`}
                  style={i === imgIndex ? { borderColor: colors.fourth } : {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title, Badges, Description */}
        <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
              style={{ backgroundColor: catColor.bg, color: catColor.text }}
            >
              {item.category}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {item.gender}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{item.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-line">{item.description}</p>

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Category-Specific Details */}
        <CategoryDetails item={item} colors={colors} />

        {/* Creator Info */}
        <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
            >
              <PersonOutlined sx={{ fontSize: 20 }} style={{ color: colors.fourth }} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Created by</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-dark-text">
                {item.expert?.user?.fullName || "Expert"}
              </p>
            </div>
            <span className="ml-auto text-xs text-gray-400">
              {dayjs(item.createdAt).format("MMM D, YYYY")}
            </span>
          </div>
        </div>

        {/* Suggestions Section */}
        <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChatBubbleOutlineOutlined sx={{ fontSize: 18 }} style={{ color: colors.fourth }} />
            <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
              Suggestions ({item.suggestions?.length || 0})
            </h3>
          </div>

          {/* Add suggestion (not for creator) */}
          {!isCreator && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Suggest an improvement..."
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSuggestion()}
                className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none"
                maxLength={1000}
              />
              <button
                onClick={handleSuggestion}
                disabled={!suggestionText.trim() || submitting}
                className="px-3 py-2 rounded-lg text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: colors.fourth }}
              >
                <SendOutlined sx={{ fontSize: 18 }} />
              </button>
            </div>
          )}

          {/* Suggestions list */}
          {item.suggestions?.length > 0 ? (
            <div className="space-y-3">
              {item.suggestions.map((s, i) => (
                <div key={s._id || i} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {s.expertName}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {dayjs(s.createdAt).format("MMM D, YYYY")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{s.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No suggestions yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Category-Specific Details ──────────────────────────────────────────────

const DetailField = ({ label, value }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{display}</p>
    </div>
  );
};

const CategoryDetails = ({ item, colors }) => {
  const fields = [];

  if (item.category === "clothing") {
    fields.push(
      { label: "Clothing Type", value: item.clothingType },
      { label: "Subcategory", value: item.subcategory },
      { label: "Fabric", value: item.fabric },
      { label: "Pattern", value: item.pattern },
      { label: "Season", value: item.season },
      { label: "Occasions", value: item.occasions },
      { label: "Colors", value: item.colors },
      { label: "Brand", value: item.brand },
      { label: "Price Range", value: item.priceRange },
      { label: "Style Vibe", value: item.styleVibe }
    );
  } else if (item.category === "hair") {
    fields.push(
      { label: "Hair Type", value: item.hairType },
      { label: "Hair Length", value: item.hairLength },
      { label: "Suitable Face Shapes", value: item.faceShapes },
      { label: "Maintenance Level", value: item.maintenanceLevel }
    );
  } else if (item.category === "makeup") {
    fields.push(
      { label: "Look Type", value: item.lookType },
      { label: "Suitable Skin Tones", value: item.skinTones }
    );
  }

  const validFields = fields.filter((f) => f.value && (!Array.isArray(f.value) || f.value.length > 0));
  if (validFields.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-primary rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-4 capitalize">
        {item.category} Details
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {validFields.map((f) => (
          <DetailField key={f.label} label={f.label} value={f.value} />
        ))}
      </div>

      {/* Products list (makeup) */}
      {item.category === "makeup" && item.products?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Products Used</p>
          <div className="space-y-1.5">
            {item.products.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900 dark:text-dark-text">{p.name}</span>
                {p.brand && <span className="text-gray-400">by {p.brand}</span>}
                {p.shade && <span className="text-xs text-gray-400">({p.shade})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCatalogDetail;
