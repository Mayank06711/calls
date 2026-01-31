import React from 'react';
import { Close, OpenInNew, Store, ShoppingBag } from '@mui/icons-material';
import { IconButton } from '@mui/material';

function ProductDetailModal({ product, onClose, colors }) {
  if (!product) return null;

  const platformColor = PLATFORM_COLORS[product.platform] || colors.fourth;

  // TODO: [AFFILIATE] Track product view event here
  // e.g. trackEvent('product_view', { productId, platform, brand, source: 'notification' })

  const handleVisitPlatform = () => {
    // TODO: [AFFILIATE] Track affiliate click-through here before redirecting
    // e.g. trackEvent('affiliate_click', { productId, platform, brand, price, userId })
    // This is where we'd append our affiliate referral code to the URL
    // e.g. `${product.link}?ref=knowyourstyle&tag=kys-21`
    window.open(product.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl dark:bg-dark-secondary bg-white"
        style={{ border: `1px solid ${colors.fourth}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <IconButton
          size="small"
          onClick={onClose}
          className="!absolute !top-3 !right-3 !z-10"
          sx={{
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.4)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        {/* Product Image - full image with blurred bg fill */}
        <div className="relative w-full h-64 overflow-hidden">
          {product.image ? (
            <>
              {/* Blurred background fill */}
              <img
                src={product.image.replace('w=120&h=120', 'w=100&h=100')}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
              />
              {/* Actual image - fully visible */}
              <img
                src={product.image.replace('w=120&h=120', 'w=600&h=600')}
                alt={product.name}
                className="relative w-full h-full object-contain z-[1]"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full" style={{ background: `linear-gradient(135deg, ${colors.fourth}20, ${colors.fourth}08)` }}>
              <ShoppingBag sx={{ fontSize: 64, color: `${colors.fourth}60` }} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Platform + Brand row */}
          <div className="flex items-center gap-2 mb-3">
            {product.platform && (
              <span
                className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium"
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
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                backgroundColor: `${colors.fourth}15`,
                color: colors.fourth,
              }}
            >
              {product.brand}
            </span>
          </div>

          {/* Product Name */}
          <h2 className="text-lg font-bold dark:text-dark-text text-light-text mb-1">
            {product.name}
          </h2>

          {/* Color */}
          {product.color && (
            <div className="flex items-center gap-2 mb-4">
              <span
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: product.color.hex }}
              />
              <span className="text-sm dark:text-gray-400 text-gray-500">
                {product.color.name}
              </span>
            </div>
          )}

          {/* Price */}
          {product.price != null && (
            <div className="mb-5">
              <span
                className="text-2xl font-bold"
                style={{ color: colors.fourth }}
              >
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Visit Platform Button */}
          <button
            onClick={handleVisitPlatform}
            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            <ShoppingBag sx={{ fontSize: 20 }} />
            View on {product.platform || 'Store'}
            <OpenInNew sx={{ fontSize: 16 }} />
          </button>

          {/* Affiliate disclaimer */}
          <p className="text-[10px] text-gray-400 text-center mt-2">
            You will be redirected to {product.platform || 'the store'}. We may earn a small commission.
          </p>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_COLORS = {
  Amazon: '#FF9900',
  Flipkart: '#2874F0',
  Myntra: '#FF3F6C',
  Ajio: '#1B2834',
  Meesho: '#570741',
};

export default ProductDetailModal;
