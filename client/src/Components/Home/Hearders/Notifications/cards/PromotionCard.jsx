import React from 'react';
import { Close, LocalOffer, Schedule } from '@mui/icons-material';
import { IconButton } from '@mui/material';

function PromotionCard({ notification, onDismiss, colors }) {
  const { id, title, description, discount, expiresIn, createdAt } = notification;

  const timeAgo = getTimeAgo(createdAt);

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white"
      style={{
        border: `1px solid ${colors.fourth}20`,
        borderLeft: `3px solid ${colors.fourth}`,
      }}
    >
      {/* Dismiss Button */}
      <IconButton
        size="small"
        onClick={() => onDismiss(id)}
        className="!absolute !top-2 !right-2"
        sx={{
          color: 'gray',
          '&:hover': { color: colors.fourth, backgroundColor: `${colors.fourth}15` },
        }}
      >
        <Close fontSize="small" />
      </IconButton>

      <div className="flex gap-3 pr-8">
        {/* Promo Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${colors.fourth}30, ${colors.fourth}10)`,
          }}
        >
          <LocalOffer style={{ color: colors.fourth, fontSize: 20 }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm dark:text-dark-text text-light-text">{title}</h4>
          <p className="text-sm dark:text-gray-400 text-gray-500 mt-1 leading-relaxed">
            {description}
          </p>

          {/* Discount Badge + Expiry */}
          <div className="flex items-center gap-3 mt-2">
            {discount && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{
                  backgroundColor: colors.fourth,
                  color: '#fff',
                }}
              >
                {discount}
              </span>
            )}

            {expiresIn && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#F59E0B' }}>
                <Schedule sx={{ fontSize: 12 }} />
                Ends in {expiresIn}
              </span>
            )}
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-2">{timeAgo}</p>
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

export default PromotionCard;
