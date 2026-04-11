import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ShareOutlined,
  AutoAwesomeOutlined,
} from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import { getCloudinaryThumbnail } from '../../../../utils/cloudinaryUtils';
import { fetchItemCatalog } from '../../../../redux/thunks/itemCatalog.thunks';
import { shareCatalogItem } from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'hair', label: 'Hair' },
  { key: 'makeup', label: 'Makeup' },
];

const CATEGORY_BADGE = {
  clothing: { bg: '#EEF2FF', text: '#4F46E5' },
  hair: { bg: '#FDF2F8', text: '#DB2777' },
  makeup: { bg: '#FFF7ED', text: '#EA580C' },
};

const SessionCatalogPanel = ({ bookingId, sessionActive, colors, onTryOn }) => {
  const dispatch = useDispatch();
  const searchTimeout = useRef(null);

  const catalogList = useSelector((state) => state.itemCatalog?.list);
  const isLoading = useSelector(
    (state) => state.loaderState?.loaders?.[LOADER_TYPES.ITEM_CATALOG_LIST]
  );
  const sharedCatalogItems = useSelector(
    (state) => state.booking?.sharedCatalogItems || []
  );

  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sharingId, setSharingId] = useState(null);

  // Build set of already-shared item IDs for quick lookup
  const sharedIds = new Set(
    sharedCatalogItems.map((s) => s.catalogItem?._id || s.catalogItem)
  );

  // Fetch on category/search/page change
  useEffect(() => {
    const filters = { page, limit: 20 };
    if (category) filters.category = category;
    if (search.trim()) filters.search = search.trim();
    dispatch(fetchItemCatalog(filters));
  }, [category, search, page, dispatch]);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
  }, []);

  const handleShare = async (itemId) => {
    if (!sessionActive || sharingId) return;
    setSharingId(itemId);
    await dispatch(shareCatalogItem(bookingId, itemId));
    setSharingId(null);
  };

  const items = catalogList?.items || [];
  const pagination = catalogList?.pagination;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Category pills */}
        <div className="flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setCategory(cat.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat.key
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
              }`}
              style={category === cat.key ? { backgroundColor: colors.fourth } : {}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <SearchOutlined
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            sx={{ fontSize: 18 }}
          />
          <input
            type="text"
            placeholder="Search catalog..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading && items.length === 0 ? (
        <div className="text-center py-12">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading catalog...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No items found. Try a different filter or search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item) => {
            const isShared = sharedIds.has(item._id);
            const isSharing = sharingId === item._id;
            const badge = CATEGORY_BADGE[item.category] || CATEGORY_BADGE.clothing;
            const thumb = item.images?.[0]
              ? getCloudinaryThumbnail(item.images[0], 300, 300)
              : null;

            return (
              <div
                key={item._id}
                className="bg-white dark:bg-dark-primary rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Image */}
                {thumb ? (
                  <img
                    src={thumb}
                    alt={item.title}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 dark:bg-gray-800" />
                )}

                {/* Info + Share */}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-gray-900 dark:text-dark-text line-clamp-2 leading-tight mb-1.5">
                    {item.title}
                  </p>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium mb-2"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {item.category?.charAt(0).toUpperCase() + item.category?.slice(1)}
                  </span>

                  {/* Share + Try On buttons */}
                  <div className="flex items-center gap-1.5">
                    {isShared ? (
                      <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircleOutlined sx={{ fontSize: 14 }} />
                        Shared
                      </div>
                    ) : (
                      <button
                        onClick={() => handleShare(item._id)}
                        disabled={!sessionActive || isSharing}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: colors.fourth }}
                      >
                        <ShareOutlined sx={{ fontSize: 14 }} />
                        {isSharing ? 'Sharing...' : 'Share'}
                      </button>
                    )}
                    {isShared && (
                      <button
                        onClick={() => onTryOn?.(item)}
                        disabled={!sessionActive}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                        style={{ backgroundColor: '#8B5CF6' }}
                      >
                        <AutoAwesomeOutlined sx={{ fontSize: 14 }} />
                        Try On
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {pagination && page < pagination.totalPages && (
        <div className="text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionCatalogPanel;
