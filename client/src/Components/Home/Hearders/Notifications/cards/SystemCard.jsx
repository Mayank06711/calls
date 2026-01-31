import React from 'react';
import { Close, Warning, Info, Security } from '@mui/icons-material';
import { IconButton } from '@mui/material';

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: '#3B82F6',
    label: 'Info',
  },
  warning: {
    icon: Warning,
    color: '#F59E0B',
    label: 'Warning',
  },
  critical: {
    icon: Security,
    color: '#EF4444',
    label: 'Critical',
  },
};

function SystemCard({ notification, onDismiss, colors }) {
  const { id, severity, title, message, createdAt } = notification;
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const SeverityIcon = config.icon;

  const timeAgo = getTimeAgo(createdAt);

  return (
    <div
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white"
      style={{
        border: `1px solid ${colors.fourth}20`,
        borderLeft: `3px solid ${config.color}`,
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
        {/* Severity Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <SeverityIcon style={{ color: config.color, fontSize: 20 }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm dark:text-dark-text text-light-text">{title}</h4>
          <p className="text-sm dark:text-gray-400 text-gray-500 mt-1 leading-relaxed">{message}</p>

          {/* Severity Badge + Timestamp */}
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
              style={{
                backgroundColor: `${config.color}15`,
                color: config.color,
              }}
            >
              <SeverityIcon sx={{ fontSize: 12 }} />
              {config.label}
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

export default SystemCard;
