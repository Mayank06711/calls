import React, { useState, useRef, useEffect } from 'react';
import {
  Notifications,
  DeleteSweep,
  NotificationsNone,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';
import { useNotifications } from '../../../../hooks/useNotifications';
import { useAIContext } from '../../../../context/AIContext';
import SuggestionCard from './cards/SuggestionCard';
import SystemCard from './cards/SystemCard';
import SocialCard from './cards/SocialCard';
import PromotionCard from './cards/PromotionCard';
import WardrobeCard from './cards/WardrobeCard';

const TAB_LABELS = {
  all: 'All',
  suggestion: 'Suggestions',
  social: 'Social',
  promotion: 'Promotions',
  system: 'System',
  wardrobe: 'Wardrobe',
};

const CARD_COMPONENTS = {
  suggestion: SuggestionCard,
  social: SocialCard,
  promotion: PromotionCard,
  system: SystemCard,
  wardrobe: WardrobeCard,
};

function NotificationPage() {
  const colors = useSubscriptionColors();
  const {
    grouped,
    activeCategory,
    setActiveCategory,
    dismiss,
    clearAll,
    markAllAsRead,
    counts,
    unreadCount,
    categories,
    notifications,
  } = useNotifications();

  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // Mark all as read when opening the notification page
  useEffect(() => {
    markAllAsRead();
  }, []);

  // AI context for notifications page
  useEffect(() => {
    const total = notifications.length;
    const catSummary = categories
      .filter(c => c !== 'all')
      .map(c => `${TAB_LABELS[c]}: ${counts[c] || 0}`)
      .join(', ');
    const summary = total === 0
      ? `User is viewing notifications. No notifications of any type. Categories available: ${categories.filter(c => c !== 'all').map(c => TAB_LABELS[c]).join(', ')}.`
      : `User is viewing notifications. Total: ${total}${unreadCount > 0 ? `, ${unreadCount} unread` : ''}. By category — ${catSummary}. Currently filtering by: ${TAB_LABELS[activeCategory]}.`;
    setAIPageContext({ page: "notifications", description: summary });
    return () => clearAIPageContext();
  }, [notifications.length, unreadCount, counts, activeCategory, categories, setAIPageContext, clearAIPageContext]);

  const renderCard = (notification) => {
    const CardComponent = CARD_COMPONENTS[notification.type];
    if (!CardComponent) return null;
    return (
      <CardComponent
        key={notification.id}
        notification={notification}
        onDismiss={dismiss}
        colors={colors}
      />
    );
  };

  return (
    <div className="p-4 md:p-6">
      {/* Top Bar - left aligned */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${colors.fourth}30, ${colors.fourth}10)`,
            }}
          >
            <Notifications style={{ color: colors.fourth, fontSize: 20 }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{
                background: `linear-gradient(90deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Notifications
            </h1>
            <p className="text-xs dark:text-gray-400 text-gray-500">
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              {unreadCount > 0 && ` · ${unreadCount} unread`}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-80"
              style={{
                border: `1px solid ${colors.fourth}40`,
                color: colors.fourth,
              }}
            >
              <DeleteSweep sx={{ fontSize: 14 }} />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Category Dropdown */}
      <div className="mb-5">
        <CategoryDropdown
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          counts={counts}
          colors={colors}
        />
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <div className="space-y-5">
          {grouped.map(([label, items]) => (
            <div key={label}>
              {/* Date Group Header */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: colors.fourth }}
                >
                  {label}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: `${colors.fourth}30` }}
                />
              </div>

              {/* Cards */}
              <div className="space-y-3">{items.map(renderCard)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryDropdown({ categories, activeCategory, setActiveCategory, counts, colors }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-fit" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          backgroundColor: `${colors.fourth}12`,
          color: colors.fourth,
          border: `1px solid ${colors.fourth}30`,
        }}
      >
        {TAB_LABELS[activeCategory]}
        {counts[activeCategory] > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: colors.fourth, color: '#fff' }}
          >
            {counts[activeCategory]}
          </span>
        )}
        <KeyboardArrowDown
          sx={{ fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="absolute top-full left-0 mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[180px] dark:bg-dark-secondary bg-white"
          style={{ border: `1px solid ${colors.fourth}20` }}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors"
                style={{
                  backgroundColor: isActive ? `${colors.fourth}15` : 'transparent',
                  color: isActive ? colors.fourth : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.target.style.backgroundColor = `${colors.fourth}08`;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.target.style.backgroundColor = 'transparent';
                }}
              >
                <span className={`${isActive ? 'font-semibold' : ''} dark:text-dark-text text-light-text`}
                  style={isActive ? { color: colors.fourth } : {}}
                >
                  {TAB_LABELS[cat]}
                </span>
                {counts[cat] > 0 && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive ? colors.fourth : `${colors.fourth}20`,
                      color: isActive ? '#fff' : colors.fourth,
                    }}
                  >
                    {counts[cat]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ colors }) {
  return (
    <div className="text-center py-16">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{
          background: `linear-gradient(135deg, ${colors.fourth}20, ${colors.fourth}08)`,
          border: `2px dashed ${colors.fourth}40`,
        }}
      >
        <NotificationsNone style={{ color: `${colors.fourth}60`, fontSize: 28 }} />
      </div>

      <h3
        className="text-lg font-bold mb-1"
        style={{
          background: `linear-gradient(90deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        All Caught Up!
      </h3>

      <p className="text-gray-400 dark:text-gray-500 text-sm">
        No notifications right now.
      </p>
    </div>
  );
}

export default NotificationPage;
