import React from 'react';
import { Close, Favorite, PersonAdd, ChatBubble, AlternateEmail } from '@mui/icons-material';
import { IconButton } from '@mui/material';

const ACTION_CONFIG = {
  like: {
    icon: Favorite,
    color: '#EF4444',
    text: (user) => `${user} liked your post`,
  },
  follow: {
    icon: PersonAdd,
    color: '#8B5CF6',
    text: (user) => `${user} started following you`,
  },
  comment: {
    icon: ChatBubble,
    color: '#3B82F6',
    text: (user) => `${user} commented on your post`,
  },
  mention: {
    icon: AlternateEmail,
    color: '#F59E0B',
    text: (user) => `${user} mentioned you`,
  },
};

function SocialCard({ notification, onDismiss, colors }) {
  const { id, action, content, createdAt, message, title } = notification;
  const user = notification.user || { name: title || message || 'Someone', avatar: '' };
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.like;
  const ActionIcon = config.icon;

  const timeAgo = getTimeAgo(createdAt);

  // Generate initials for avatar fallback
  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

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
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold"
          style={{
            background: user.avatar
              ? `url(${user.avatar}) center/cover`
              : `linear-gradient(135deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
          }}
        >
          {!user.avatar && initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm dark:text-dark-text text-light-text">
            <span className="font-semibold">{user.name}</span>{' '}
            {config.text(user.name).replace(user.name, '').trim()}
          </p>

          {content && (
            <p className="text-sm italic dark:text-gray-400 text-gray-500 mt-0.5 truncate">
              "{content}"
            </p>
          )}

          {/* Action Icon + Timestamp */}
          <div className="flex items-center gap-2 mt-2">
            <ActionIcon sx={{ fontSize: 14, color: config.color }} />
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

export default SocialCard;
