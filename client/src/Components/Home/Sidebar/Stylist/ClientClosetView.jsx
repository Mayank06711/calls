import React, { useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CloseOutlined,
  EditOutlined,
  CheckroomOutlined,
  SaveOutlined,
} from '@mui/icons-material';
import { Button } from '@mui/material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import {
  fetchClientCloset,
  editClientClosetItem,
} from '../../../../redux/thunks/booking.thunks';
import { LOADER_TYPES } from '../../../../redux/action_creators';

const TYPE_FILTERS = ['All', 'Top', 'Bottom', 'Shoes', 'Accessory', 'Outerwear', 'Full Body'];

const PATTERN_OPTIONS = ['Solid', 'Striped', 'Checked', 'Floral', 'Embroidered', 'Polka Dot', 'Abstract', 'Printed'];
const FABRIC_OPTIONS = ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Chiffon', 'Velvet', 'Satin', 'Leather', 'Georgette', 'Crepe', 'Khadi', 'Other'];
const SEASON_OPTIONS = ['Summer', 'Winter', 'Monsoon', 'All'];
const OCCASION_OPTIONS = ['Wedding', 'Office', 'Casual', 'Party', 'Travel', 'Festive', 'Date Night', 'Sports', 'Lounge'];

const ClientClosetView = ({ bookingId, items, colors }) => {
  const dispatch = useDispatch();
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.CLIENT_CLOSET]);

  const [activeFilter, setActiveFilter] = useState('All');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  const filteredItems = useMemo(() => {
    if (activeFilter === 'All') return items;
    return items.filter((item) => item.type === activeFilter);
  }, [items, activeFilter]);

  const handleFilterChange = (type) => {
    setActiveFilter(type);
    if (type !== 'All') {
      dispatch(fetchClientCloset(bookingId, { type }));
    } else {
      dispatch(fetchClientCloset(bookingId));
    }
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
    setEditForm({
      type: item.type || '',
      subcategory: item.subcategory || '',
      color: item.color || '',
      pattern: item.pattern || '',
      fabric: item.fabric || '',
      season: item.season || 'All',
      occasions: item.occasions || [],
      notes: item.notes || '',
    });
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    dispatch(
      editClientClosetItem(bookingId, editingItem._id, editForm, () => {
        setEditingItem(null);
        setEditForm({});
      })
    );
  };

  const handleOccasionToggle = (occ) => {
    setEditForm((prev) => ({
      ...prev,
      occasions: prev.occasions.includes(occ)
        ? prev.occasions.filter((o) => o !== occ)
        : [...prev.occasions, occ],
    }));
  };

  if (isLoading && items.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-3"
          style={{ borderColor: colors.fourth }}
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading closet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type}
            onClick={() => handleFilterChange(type)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeFilter === type
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-primary border border-gray-200 dark:border-gray-700'
            }`}
            style={activeFilter === type ? { backgroundColor: colors.fourth } : {}}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-4">
          <CheckroomOutlined sx={{ fontSize: 18 }} className="mr-1.5 align-text-bottom" />
          Client's Closet ({filteredItems.length} items)
        </h3>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            No items found.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item._id}
                className="group relative rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEditClick(item)}
              >
                <img
                  src={item.nobgUrl || item.thumbnailUrl || item.photoUrl}
                  alt={item.subcategory}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <EditOutlined
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    sx={{ fontSize: 24 }}
                  />
                </div>
                <div className="p-1.5">
                  <p className="text-xs font-medium text-gray-900 dark:text-dark-text truncate">
                    {item.subcategory}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {item.type} {item.color ? `| ${item.color}` : ''}
                  </p>
                </div>
                {item.addedBy && (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-yellow-400/90 text-[9px] font-medium text-yellow-900">
                    Expert
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingItem(null);
            }
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-dark-primary shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                Edit Item
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                <CloseOutlined sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Item Preview */}
            <div className="px-6 py-4">
              <img
                src={editingItem.nobgUrl || editingItem.thumbnailUrl || editingItem.photoUrl}
                alt={editingItem.subcategory}
                className="w-full h-48 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 mb-4"
              />

              {/* Form Fields */}
              <div className="space-y-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                  >
                    {TYPE_FILTERS.filter((t) => t !== 'All').map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={editForm.subcategory}
                    onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Color
                  </label>
                  <input
                    type="text"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                  />
                </div>

                {/* Pattern + Fabric */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Pattern
                    </label>
                    <select
                      value={editForm.pattern}
                      onChange={(e) => setEditForm({ ...editForm, pattern: e.target.value })}
                      className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                    >
                      <option value="">—</option>
                      {PATTERN_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Fabric
                    </label>
                    <select
                      value={editForm.fabric}
                      onChange={(e) => setEditForm({ ...editForm, fabric: e.target.value })}
                      className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
                    >
                      <option value="">—</option>
                      {FABRIC_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Season */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Season
                  </label>
                  <div className="flex gap-2">
                    {SEASON_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditForm({ ...editForm, season: s })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          editForm.season === s
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                        }`}
                        style={editForm.season === s ? { backgroundColor: colors.fourth } : {}}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Occasions */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Occasions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {OCCASION_OPTIONS.map((occ) => (
                      <button
                        key={occ}
                        onClick={() => handleOccasionToggle(occ)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          editForm.occasions.includes(occ)
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                        }`}
                        style={
                          editForm.occasions.includes(occ)
                            ? { backgroundColor: colors.fourth }
                            : {}
                        }
                      >
                        {occ}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    maxLength={500}
                    rows={2}
                    className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outlined"
                onClick={() => setEditingItem(null)}
                sx={{
                  borderColor: toRgba(colors.fourth, 0.5),
                  color: colors.fourth,
                  '&:hover': {
                    borderColor: colors.fourth,
                    backgroundColor: toRgba(colors.fourth, 0.1),
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleEditSave}
                startIcon={<SaveOutlined />}
                sx={{
                  backgroundColor: colors.fourth,
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: colors.fourth,
                    opacity: 0.9,
                  },
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientClosetView;
