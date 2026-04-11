import React from 'react';
import { Close, LocalOffer, Schedule } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { toRgba } from '../../../../../utils/getSubscriptionColors';

function PromotionCard({ notification, onDismiss, colors }) {
  const { id, title, description, message, discount, expiresIn, createdAt } = notification;
  const timeAgo = getTimeAgo(createdAt);

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white group"
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
        borderLeft: `4px solid ${colors.fourth}`,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onDismiss(id)}
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
          style={{ backgroundColor: `${toRgba(colors.fourth, 0.15)}` }}
        >
          <LocalOffer style={{ color: colors.fourth, fontSize: 18 }} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm dark:text-dark-text text-light-text">
            {title || message}
          </h4>
          {(description || (title && message && title !== message)) && (
            <p className="text-sm dark:text-gray-400 text-gray-500 mt-0.5 leading-relaxed">
              {description || message}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {discount && (
              <span
                className="text-[11px] px-2 py-0.5 rounded font-bold"
                style={{ backgroundColor: colors.fourth, color: '#fff' }}
              >
                {discount}
              </span>
            )}
            {expiresIn && (
              <span className="text-[11px] flex items-center gap-1 text-amber-500">
                <Schedule sx={{ fontSize: 11 }} />
                Ends in {expiresIn}
              </span>
            )}
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

export default PromotionCard;
