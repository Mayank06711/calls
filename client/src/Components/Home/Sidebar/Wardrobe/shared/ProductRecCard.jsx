import React from "react";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { ShoppingCartOutlined, OpenInNew } from "@mui/icons-material";

function ProductRecCard({ product }) {
  const colors = useSubscriptionColors();

  if (!product) return null;

  return (
    <div
      className="flex-shrink-0 w-44 rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border overflow-hidden transition-all hover:shadow-md group"
      style={{ borderColor: `${colors.fourth}30` }}
    >
      {/* Product image */}
      <div className="relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-36 object-cover"
          />
        ) : (
          <div
            className="w-full h-36 flex items-center justify-center"
            style={{ backgroundColor: `${colors.fourth}08` }}
          >
            <ShoppingCartOutlined style={{ color: colors.fourth, fontSize: 32, opacity: 0.3 }} />
          </div>
        )}
        {product.price && (
          <span
            className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: colors.fourth }}
          >
            ₹{product.price}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold dark:text-dark-text/90 text-light-text/90 truncate">
          {product.name}
        </p>
        {product.brand && (
          <p className="text-[10px] dark:text-dark-text/50 text-light-text/50 mt-0.5">
            {product.brand}
          </p>
        )}
        {product.link && (
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-[10px] font-medium transition-colors hover:underline"
            style={{ color: colors.fourth }}
          >
            <OpenInNew style={{ fontSize: 12 }} />
            Shop Now
          </a>
        )}
      </div>
    </div>
  );
}

export default ProductRecCard;
