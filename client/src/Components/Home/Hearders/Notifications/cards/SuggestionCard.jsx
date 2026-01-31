import React, { useState, useEffect } from 'react';
import { Close, OpenInNew, Store } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import ProductDetailModal from './ProductDetailModal';

const PLATFORM_COLORS = {
  Amazon: '#FF9900',
  Flipkart: '#2874F0',
  Myntra: '#FF3F6C',
  Ajio: '#1B2834',
  Meesho: '#570741',
};

function SuggestionCard({ notification, onDismiss, colors }) {
  const { id, message, createdAt } = notification;
  const product = notification.product || {};
  const [showModal, setShowModal] = useState(false);
  const timeAgo = getTimeAgo(createdAt);

  // Incomplete product data is useless — auto-dismiss silently
  const isComplete = product.name && product.image && product.link && product.price != null && product.brand && product.platform;
  useEffect(() => {
    if (!isComplete) onDismiss(id);
  }, [isComplete, id, onDismiss]);
  if (!isComplete) return null;
  const platformColor = PLATFORM_COLORS[product.platform] || colors.fourth;

  const handleProductClick = (e) => {
    e.preventDefault();
    // TODO: [AFFILIATE] Track product card click
    // e.g. trackEvent('notification_product_click', { productId, platform, brand, source: 'suggestion_card' })
    setShowModal(true);
  };

  return (
    <>
      <div
        className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white cursor-pointer"
        style={{
          border: `1px solid ${colors.fourth}20`,
          borderLeft: `3px solid ${colors.fourth}`,
        }}
        onClick={handleProductClick}
      >
        {/* Dismiss Button */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(id);
          }}
          className="!absolute !top-2 !right-2"
          sx={{
            color: 'gray',
            '&:hover': { color: colors.fourth, backgroundColor: `${colors.fourth}15` },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        <div className="flex gap-3 pr-8">
          {/* Product Image */}
          <div
            className="w-[60px] h-[60px] rounded-lg overflow-hidden flex-shrink-0"
            style={{ border: `1px solid ${colors.fourth}20` }}
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.style.background = `linear-gradient(135deg, ${colors.fourth}30, ${colors.fourth}10)`;
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm dark:text-gray-400 text-gray-500 mb-1">{message}</p>

            {/* Product Name */}
            <span
              className="inline-flex items-center gap-1 font-semibold text-sm hover:underline"
              style={{ color: colors.fourth }}
            >
              {product.name}
              <OpenInNew sx={{ fontSize: 14 }} />
            </span>

            {/* Price + Brand + Color + Platform */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {product.price != null && (
                <span className="font-bold text-sm dark:text-white text-gray-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
              )}

              {product.brand && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${colors.fourth}15`,
                    color: colors.fourth,
                  }}
                >
                  {product.brand}
                </span>
              )}

              {product.color && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${colors.fourth}15`,
                    color: colors.fourth,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: product.color.hex }}
                  />
                  {product.color.name}
                </span>
              )}

              {/* Platform Tag */}
              {product.platform && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                  style={{
                    backgroundColor: `${platformColor}18`,
                    color: platformColor,
                    border: `1px solid ${platformColor}30`,
                  }}
                >
                  <Store sx={{ fontSize: 12 }} />
                  {product.platform}
                </span>
              )}
            </div>

            {/* Timestamp */}
            <p className="text-xs text-gray-400 mt-2">{timeAgo}</p>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {showModal && (
        <ProductDetailModal
          product={product}
          onClose={() => setShowModal(false)}
          colors={colors}
        />
      )}
    </>
  );
}

function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return '1 day ago';
  return `${Math.floor(diff / 86400)} days ago`;
}

export default SuggestionCard;
