import React from 'react';
import { AutoAwesomeOutlined } from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import { getCloudinaryThumbnail } from '../../../../utils/cloudinaryUtils';
import dayjs from 'dayjs';

const CATEGORY_BADGE = {
  clothing: { bg: '#EEF2FF', text: '#4F46E5', label: 'Clothing' },
  hair: { bg: '#FDF2F8', text: '#DB2777', label: 'Hair' },
  makeup: { bg: '#FFF7ED', text: '#EA580C', label: 'Makeup' },
};

const SharedRecommendations = ({ sharedItems, role, colors, onItemClick, onTryOn }) => {
  if (!sharedItems || sharedItems.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        >
          <AutoAwesomeOutlined sx={{ fontSize: 18 }} style={{ color: colors.fourth }} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
            Recommendations
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sharedItems.length} item{sharedItems.length !== 1 ? 's' : ''} shared
            {role === 'user' ? ' by your expert' : ' with client'}
          </p>
        </div>
      </div>

      {/* Scrollable card row */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {sharedItems.map((shared) => {
          const item = shared.catalogItem;
          if (!item || !item._id) return null;

          const badge = CATEGORY_BADGE[item.category] || CATEGORY_BADGE.clothing;
          const thumb = item.images?.[0]
            ? getCloudinaryThumbnail(item.images[0], 300, 300)
            : null;

          return (
            <div
              key={item._id}
              className="flex-shrink-0 w-36 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <div className="cursor-pointer" onClick={() => onItemClick(shared)}>
                {thumb ? (
                  <img
                    src={thumb}
                    alt={item.title}
                    className="w-full h-28 object-cover"
                  />
                ) : (
                  <div className="w-full h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <AutoAwesomeOutlined className="text-gray-300" sx={{ fontSize: 28 }} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2">
                <p
                  className="text-xs font-medium text-gray-900 dark:text-dark-text line-clamp-2 leading-tight cursor-pointer"
                  onClick={() => onItemClick(shared)}
                >
                  {item.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {dayjs(shared.sharedAt).format('h:mm A')}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onTryOn?.(item); }}
                  className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  <AutoAwesomeOutlined sx={{ fontSize: 12 }} />
                  Try On
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SharedRecommendations;
