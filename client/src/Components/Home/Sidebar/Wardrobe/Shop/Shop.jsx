import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { fetchProductCatalogThunk } from "../../../../../redux/thunks/wardrobe.thunks";
import PremiumGate from "../shared/PremiumGate";
import ProductRecCard from "../shared/ProductRecCard";

const CATEGORY_TABS = [
  { key: "all", label: "All" },
  { key: "Top", label: "Tops" },
  { key: "Bottom", label: "Bottoms" },
  { key: "Outerwear", label: "Layers" },
  { key: "Shoes", label: "Footwear" },
];

function Shop() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, products } = useSelector((s) => s.wardrobe.productCatalog);
  const gender = useSelector((s) => s.wardrobe.styleProfile?.data?.gender);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const params = {};
    if (gender) params.gender = gender;
    dispatch(fetchProductCatalogThunk(params));
  }, [dispatch, gender]);

  const filtered = category === "all"
    ? products
    : products.filter((p) => p.subcategory === category || p.type === category || p.category === category);

  return (
    <PremiumGate requiredTier="Silver" message="Shop requires Silver or above">
      <div className="p-2 sm:p-4 w-full h-full overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <IconButton onClick={() => navigate("/wardrobe")} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <div>
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
              Shop
            </h2>
            <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
              Based on your closet gaps
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 mt-3 overflow-x-auto pb-1">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                category === tab.key ? "text-white" : "dark:text-dark-text/60 text-light-text/60"
              }`}
              style={{
                backgroundColor: category === tab.key ? colors.fourth : `${colors.fourth}10`,
                borderWidth: 1,
                borderColor: category === tab.key ? colors.fourth : `${colors.fourth}20`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <CircularProgress size={24} style={{ color: colors.fourth }} />
          </div>
        )}

        {/* Product grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product, idx) => (
              <ProductRecCard key={product._id || idx} product={product} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-3 opacity-20">🛒</span>
            <p className="text-sm dark:text-dark-text/50 text-light-text/50">
              No products available yet
            </p>
            <p className="text-[10px] dark:text-dark-text/30 text-light-text/30 mt-1">
              Products will appear based on your style profile and closet gaps
            </p>
          </div>
        )}
      </div>
    </PremiumGate>
  );
}

export default Shop;
