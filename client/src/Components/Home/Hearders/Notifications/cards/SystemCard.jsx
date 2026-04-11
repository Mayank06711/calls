import React from 'react';
import { Close, WarningAmber, InfoOutlined, GppBad } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { toRgba } from '../../../../../utils/getSubscriptionColors';

const SEVERITY_CONFIG = {
  info: {
    icon: InfoOutlined,
    color: '#3B82F6',
    bg: '#EFF6FF',
    darkBg: 'rgba(59,130,246,0.12)',
    label: 'Info',
  },
  warning: {
    icon: WarningAmber,
    color: '#D97706',
    bg: '#FFFBEB',
    darkBg: 'rgba(217,119,6,0.12)',
    label: 'Warning',
  },
  critical: {
    icon: GppBad,
    color: '#DC2626',
    bg: '#FEF2F2',
    darkBg: 'rgba(220,38,38,0.12)',
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
      className="relative p-4 rounded-xl transition-all duration-200 hover:shadow-md dark:bg-dark-secondary bg-white group"
      style={{
        border: `1px solid ${toRgba(colors.fourth, 0.15)}`,
        borderLeft: `4px solid ${config.color}`,
      }}
    >
      {/* Dismiss */}
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
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: config.darkBg }}
        >
          <SeverityIcon style={{ color: config.color, fontSize: 18 }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-semibold text-sm dark:text-dark-text text-light-text truncate">
              {title || message}
            </h4>
          </div>

          {title && title !== message && (
            <p className="text-sm dark:text-gray-400 text-gray-500 leading-relaxed">
              {message}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide"
              style={{
                backgroundColor: config.darkBg,
                color: config.color,
              }}
            >
              {config.label}
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

export default SystemCard;
