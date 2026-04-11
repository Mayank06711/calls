import React from 'react';
import { Close, Favorite, PersonAdd, ChatBubble, AlternateEmail } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { toRgba } from '../../../../../utils/getSubscriptionColors';

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

  const initials = (user.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white group"
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
        borderLeft: `4px solid ${config.color}`,
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
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-semibold overflow-hidden"
          style={{
            background: user.avatar
              ? `url(${user.avatar}) center/cover`
              : `linear-gradient(135deg, ${config.color}, ${toRgba(config.color, 0.7)})`,
          }}
        >
          {!user.avatar && initials}
        </div>

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

          <div className="flex items-center gap-2 mt-2">
            <ActionIcon sx={{ fontSize: 13, color: config.color }} />
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

export default SocialCard;
