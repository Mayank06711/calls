import React from 'react';
import { Close, Checkroom, AutoAwesome } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { toRgba } from '../../../../../utils/getSubscriptionColors';

function WardrobeCard({ notification, onDismiss, colors }) {
  const { id, title, message, createdAt, wardrobe } = notification;
  const timeAgo = getTimeAgo(createdAt);

  // Determine icon/color based on action type
  const actionType = wardrobe?.actionType || 'default';
  const isNewItem = actionType === 'new_item' || actionType === 'batch_add';
  const isPairings = actionType === 'pairings_generated';

  const accentColor = isPairings ? '#8B5CF6' : colors.fourth;
  const Icon = isPairings ? AutoAwesome : Checkroom;

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white"
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.2)}`,
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      {/* Dismiss */}
      <IconButton
        size="small"
        onClick={() => onDismiss(id)}
        className="!absolute !top-2 !right-2"
        sx={{
          color: 'gray',
          '&:hover': { color: colors.fourth, backgroundColor: `${toRgba(colors.fourth, 0.15)}` },
        }}
      >
        <Close fontSize="small" />
      </IconButton>

      <div className="flex gap-3 pr-8">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${toRgba(accentColor, 0.2)}` }}
        >
          <Icon style={{ color: accentColor, fontSize: 20 }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm dark:text-dark-text text-light-text">
            {title || 'Wardrobe Update'}
          </h4>
          <p className="text-sm dark:text-gray-400 text-gray-500 mt-1 leading-relaxed">
            {message}
          </p>

          {/* Thumbnails preview if available */}
          {wardrobe?.thumbnails && wardrobe.thumbnails.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {wardrobe.thumbnails.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                  style={{ border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
                />
              ))}
            </div>
          )}

          {/* Badge + Timestamp */}
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{
                backgroundColor: `${toRgba(accentColor, 0.15)}`,
                color: accentColor,
              }}
            >
              <Icon sx={{ fontSize: 12 }} />
              {isPairings ? 'Pairings' : isNewItem ? 'Closet' : 'Wardrobe'}
            </span>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
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

export default WardrobeCard;
