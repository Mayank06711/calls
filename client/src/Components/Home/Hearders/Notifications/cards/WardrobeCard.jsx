import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Close, Checkroom, AutoAwesome } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { toRgba } from '../../../../../utils/getSubscriptionColors';

function WardrobeCard({ notification, onDismiss, colors }) {
  const navigate = useNavigate();
  const { id, title, message, createdAt, wardrobe, extLink } = notification;
  const timeAgo = getTimeAgo(createdAt);

  const actionType = wardrobe?.actionType || 'default';
  const isNewItem = actionType === 'new_item' || actionType === 'batch_add';
  const isPairings = actionType === 'pairings_generated';

  const accentColor = isPairings ? '#8B5CF6' : colors.fourth;
  const Icon = isPairings ? AutoAwesome : Checkroom;

  const handleClick = () => {
    if (extLink) navigate(extLink);
  };

  return (
    <div
      className={`relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white group ${extLink ? 'cursor-pointer' : ''}`}
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
        borderLeft: `4px solid ${accentColor}`,
      }}
      onClick={handleClick}
    >
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
        className="!absolute !top-2 !right-2 !opacity-0 group-hover:!opacity-100 !transition-opacity"
        sx={{
          color: 'gray',
          '&:hover': { color: colors.fourth, backgroundColor: `${toRgba(colors.fourth, 0.15)}` },
        }}
      >
        <Close fontSize="small" />
      </IconButton>

      <div className="flex gap-3 pr-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${toRgba(accentColor, 0.15)}` }}
        >
          <Icon style={{ color: accentColor, fontSize: 18 }} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm dark:text-dark-text text-light-text">
            {title || 'Wardrobe Update'}
          </h4>
          <p className="text-sm dark:text-gray-400 text-gray-500 mt-0.5 leading-relaxed">
            {message}
          </p>

          {wardrobe?.thumbnails && wardrobe.thumbnails.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {wardrobe.thumbnails.slice(0, 4).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-9 h-9 rounded-md object-cover"
                  style={{ border: `1px solid ${toRgba(colors.fourth, 0.2)}` }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
              style={{
                backgroundColor: `${toRgba(accentColor, 0.12)}`,
                color: accentColor,
              }}
            >
              {isPairings ? 'Pairings' : isNewItem ? 'Closet' : 'Wardrobe'}
            </span>
            <span className="text-[11px] text-gray-400">{timeAgo}</span>
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
