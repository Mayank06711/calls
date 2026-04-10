import React, { useState } from 'react';
import {
  CloseOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import { getCloudinaryThumbnail } from '../../../../utils/cloudinaryUtils';

const CATEGORY_BADGE = {
  clothing: { bg: '#EEF2FF', text: '#4F46E5', label: 'Clothing' },
  hair: { bg: '#FDF2F8', text: '#DB2777', label: 'Hair' },
  makeup: { bg: '#FFF7ED', text: '#EA580C', label: 'Makeup' },
};

const CatalogItemModal = ({ item, note, onClose, colors }) => {
  const [imgIdx, setImgIdx] = useState(0);

  if (!item) return null;

  const images = item.images || [];
  const badge = CATEGORY_BADGE[item.category] || CATEGORY_BADGE.clothing;

  const prev = () => setImgIdx((i) => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setImgIdx((i) => (i < images.length - 1 ? i + 1 : 0));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-primary w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <CloseOutlined sx={{ fontSize: 20 }} />
        </button>

        {/* Image gallery */}
        {images.length > 0 && (
          <div className="relative">
            <img
              src={getCloudinaryThumbnail(images[imgIdx], 600, 600)}
              alt={item.title}
              className="w-full h-72 sm:h-80 object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50"
                >
                  <ChevronLeftOutlined sx={{ fontSize: 20 }} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50"
                >
                  <ChevronRightOutlined sx={{ fontSize: 20 }} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === imgIdx ? 'bg-white scale-125' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
            {item.gender && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {item.gender}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              {item.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Expert's note */}
          {note && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.05),
                borderColor: toRgba(colors.fourth, 0.15),
              }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: colors.fourth }}>
                Expert's Note
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{note}</p>
            </div>
          )}

          {/* Category-specific fields */}
          {item.category === 'clothing' && <ClothingFields item={item} colors={colors} />}
          {item.category === 'hair' && <HairFields item={item} colors={colors} />}
          {item.category === 'makeup' && <MakeupFields item={item} colors={colors} />}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Category-Specific Field Components ────────────────────────────────────

const FieldGrid = ({ fields, colors }) => {
  const validFields = fields.filter((f) => f.value);
  if (validFields.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {validFields.map((f) => (
        <div key={f.label} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {f.label}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-dark-text mt-0.5">
            {Array.isArray(f.value) ? f.value.join(', ') : f.value}
          </p>
        </div>
      ))}
    </div>
  );
};

const ClothingFields = ({ item, colors }) => (
  <FieldGrid
    colors={colors}
    fields={[
      { label: 'Type', value: item.clothingType },
      { label: 'Subcategory', value: item.subcategory },
      { label: 'Fabric', value: item.fabric },
      { label: 'Pattern', value: item.pattern },
      { label: 'Season', value: item.season },
      { label: 'Occasions', value: item.occasions },
      { label: 'Colors', value: item.colors },
      { label: 'Brand', value: item.brand },
      { label: 'Price Range', value: item.priceRange },
      { label: 'Style Vibe', value: item.styleVibe },
    ]}
  />
);

const HairFields = ({ item, colors }) => (
  <FieldGrid
    colors={colors}
    fields={[
      { label: 'Hair Type', value: item.hairType },
      { label: 'Hair Length', value: item.hairLength },
      { label: 'Face Shapes', value: item.faceShapes },
      { label: 'Maintenance', value: item.maintenanceLevel },
    ]}
  />
);

const MakeupFields = ({ item, colors }) => (
  <div className="space-y-3">
    <FieldGrid
      colors={colors}
      fields={[
        { label: 'Look Type', value: item.lookType },
        { label: 'Skin Tones', value: item.skinTones },
      ]}
    />
    {item.products?.length > 0 && (
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          Products
        </p>
        <div className="space-y-1">
          {item.products.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
              <span>{p.name}</span>
              {p.brand && <span className="text-gray-400">({p.brand})</span>}
              {p.shade && <span className="text-gray-400">- {p.shade}</span>}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default CatalogItemModal;
