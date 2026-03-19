import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Switch } from '@mui/material';
import dayjs from 'dayjs';
import {
  ArrowBack,
  PersonOutlined,
  CalendarMonthOutlined,
  AccessTimeOutlined,
  LockOutlined,
  LockOpenOutlined,
  CheckroomOutlined,
  StyleOutlined,
  StraightenOutlined,
  VideocamOutlined,
  CancelOutlined,
  AddOutlined,
  CloseOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import {
  fetchBookingDetail,
  toggleBookingPermissions,
  connectBooking,
  cancelBooking,
  fetchMyBookings,
  fetchExpertBookings,
  fetchClientCloset,
  fetchClientOutfits,
  createClientOutfit,
} from '../../../../redux/thunks/booking.thunks';
import { clearBookingDetail } from '../../../../redux/actions/booking.actions';
import { LOADER_TYPES } from '../../../../redux/action_creators';
import { useSocketContext } from '../../../../socket/SocketContext';
import ChatService from '../../../../socket/chatService';
import ClientClosetView from './ClientClosetView';

// ─── Style Profile Display ──────────────────────────────────────────────────

const PROFILE_SECTIONS = [
  { key: 'bodyShape', label: 'Body Shape', icon: '🧍' },
  { key: 'height', label: 'Height', icon: '📏' },
  { key: 'skinTone', label: 'Skin Tone', icon: '🎨' },
  { key: 'undertone', label: 'Undertone', icon: '🌡️' },
  { key: 'ageGroup', label: 'Age Group', icon: '📅' },
  { key: 'fitPreference', label: 'Fit Preference', icon: '👔' },
  { key: 'styleVibe', label: 'Style Vibe', icon: '✨' },
  { key: 'faceShape', label: 'Face Shape', icon: '🪞' },
  { key: 'hairType', label: 'Hair Type', icon: '💇' },
  { key: 'hairLength', label: 'Hair Length', icon: '📐' },
  { key: 'hairColor', label: 'Hair Color', icon: '🎨' },
  { key: 'eyeShape', label: 'Eye Shape', icon: '👁️' },
  { key: 'lipShape', label: 'Lip Shape', icon: '👄' },
  { key: 'colorPaletteSeason', label: 'Color Season', icon: '🍂' },
];

const MEASUREMENT_FIELDS = [
  { key: 'heightExact', label: 'Height', unit: 'cm' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'measurements.bust', label: 'Bust', unit: 'cm' },
  { key: 'measurements.waist', label: 'Waist', unit: 'cm' },
  { key: 'measurements.hips', label: 'Hips', unit: 'cm' },
  { key: 'measurements.inseam', label: 'Inseam', unit: 'cm' },
  { key: 'measurements.shoulderWidth', label: 'Shoulder Width', unit: 'cm' },
];

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((o, k) => o?.[k], obj);
};

// ─── Main Component ─────────────────────────────────────────────────────────

const BookingDetail = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { bookingId } = useParams();
  const colors = useSubscriptionColors();
  const { socket } = useSocketContext();

  const detail = useSelector((state) => state.booking?.bookingDetail);
  const clientCloset = useSelector((state) => state.booking?.clientCloset || []);
  const clientOutfits = useSelector((state) => state.booking?.clientOutfits || []);
  const isLoading = useSelector((state) => state.loaderState?.loaders?.[LOADER_TYPES.BOOKING_DETAIL]);

  const [activeTab, setActiveTab] = useState('profile');
  const [togglingPerm, setTogglingPerm] = useState(null); // 'closet' | 'outfits' | null

  useEffect(() => {
    if (bookingId) {
      dispatch(fetchBookingDetail(bookingId));
    }
    return () => dispatch(clearBookingDetail());
  }, [bookingId, dispatch]);

  // Fetch client data when expert tabs change and permissions allow
  useEffect(() => {
    if (!detail || detail.role !== 'expert') return;
    if (activeTab === 'closet' && detail.permissions?.closet) {
      dispatch(fetchClientCloset(bookingId));
    }
    if (activeTab === 'outfits' && detail.permissions?.outfits) {
      dispatch(fetchClientOutfits(bookingId));
    }
  }, [activeTab, detail?.permissions, bookingId, dispatch, detail?.role]);

  const handleTogglePermission = useCallback(async (perm) => {
    if (!detail) return;
    setTogglingPerm(perm);
    const newValue = !detail.permissions[perm];
    await dispatch(toggleBookingPermissions(bookingId, { [perm]: newValue }));
    setTogglingPerm(null);
  }, [detail, bookingId, dispatch]);

  const handleConnect = async () => {
    try {
      const result = await dispatch(connectBooking(bookingId));
      if (result) {
        const targetUserId = result.otherUserId || result.expertUserId;
        if (targetUserId) {
          if (socket) {
            const service = new ChatService(socket);
            service.sendChatRequest(targetUserId);
          }
          navigate('/chats/' + targetUserId);
        }
      }
    } catch (error) {
      console.error('Failed to connect booking:', error);
    }
  };

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    dispatch(cancelBooking(bookingId, undefined, () => {
      // Refresh both booking lists
      dispatch(fetchMyBookings());
      dispatch(fetchExpertBookings());
      navigate(-1);
    }));
  };

  const goBack = () => navigate(-1);

  if (isLoading || !detail) {
    return (
      <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
        <div className="sticky top-0 z-10">
          <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
            <div className="flex items-center gap-4">
              <button onClick={goBack} className="text-white hover:opacity-80 transition-opacity">
                <ArrowBack />
              </button>
              <h1 className="text-xl font-semibold text-white">Loading...</h1>
            </div>
          </div>
        </div>
        <div className="text-center py-12">
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const { booking, role, permissions, sessionActive } = detail;
  const isUser = role === 'user';
  const isExpert = role === 'expert';
  const isConfirmed = booking?.status === 'confirmed';

  return (
    <div className="min-h-screen bg-light-secondary dark:bg-dark-secondary">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10">
        <div className="px-6 py-4 shadow-sm" style={{ backgroundColor: colors.fourth }}>
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="text-white hover:opacity-80 transition-opacity">
              <ArrowBack />
            </button>
            <h1 className="text-xl font-semibold text-white flex-grow">
              {isUser ? 'Booking Details' : 'Client Session'}
            </h1>
            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isConfirmed
                  ? 'bg-green-100 text-green-800'
                  : booking?.status === 'completed'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto space-y-6">
        {/* Session Ended Banner */}
        {!sessionActive && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
            <AccessTimeOutlined className="text-amber-600 dark:text-amber-400" sx={{ fontSize: 20 }} />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {booking?.status === 'cancelled'
                ? 'This booking was cancelled.'
                : 'This session has ended. Expert access has been revoked.'}
            </p>
          </div>
        )}

        {/* Person Info Card */}
        <PersonInfoCard detail={detail} colors={colors} />

        {/* Booking Info Card */}
        <BookingInfoCard booking={booking} isUser={isUser} colors={colors} />

        {/* User View: Permission Toggles (only for active sessions) */}
        {isUser && sessionActive && (
          <PermissionTogglesCard
            permissions={permissions}
            onToggle={handleTogglePermission}
            togglingPerm={togglingPerm}
            colors={colors}
          />
        )}

        {/* Expert View: Tabbed Data Sections */}
        {isExpert && (
          <>
            <ExpertTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              permissions={permissions}
              sessionActive={sessionActive}
              colors={colors}
            />
            <ExpertTabContent
              activeTab={activeTab}
              detail={detail}
              bookingId={bookingId}
              clientCloset={clientCloset}
              clientOutfits={clientOutfits}
              permissions={permissions}
              sessionActive={sessionActive}
              colors={colors}
            />
          </>
        )}

        {/* Action Buttons (only for active sessions) */}
        {sessionActive && (
          <div className="flex gap-4 pb-4">
            <button
              onClick={handleConnect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: colors.fourth }}
            >
              <VideocamOutlined sx={{ fontSize: 20 }} />
              Connect
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-red-400 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <CancelOutlined sx={{ fontSize: 20 }} />
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const PersonInfoCard = ({ detail, colors }) => {
  const { role } = detail;
  const person = role === 'user' ? detail.expert : detail.client;
  if (!person) return null;

  const photoUrl = person.profilePhoto?.url || person.profilePhoto?.thumbnail_url;

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-4">
        {/* Photo */}
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={person.fullName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: colors.fourth }}
            >
              {person.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-grow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
            {person.fullName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{person.username}</p>
          {role === 'user' && detail.expert?.specializations && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {detail.expert.specializations.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: toRgba(colors.fourth, 0.1),
                    color: colors.fourth,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {role === 'expert' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {[person.gender, person.age ? `${person.age}y` : null, person.city]
                .filter(Boolean)
                .join(' | ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const BookingInfoCard = ({ booking, isUser, colors }) => {
  if (!booking) return null;
  const formattedDate = dayjs(booking.date).format('ddd, MMM D, YYYY');

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <CalendarMonthOutlined className="text-gray-400" sx={{ fontSize: 20 }} />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccessTimeOutlined className="text-gray-400" sx={{ fontSize: 20 }} />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
              {booking.startTime} - {booking.endTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccessTimeOutlined className="text-gray-400" sx={{ fontSize: 20 }} />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
              {booking.duration} minutes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-lg">💎</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isUser ? 'Credits Charged' : 'Credits Earned'}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
              {booking.creditsCharged} credits
            </p>
          </div>
        </div>
      </div>
      {booking.notes && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{booking.notes}</p>
        </div>
      )}
    </div>
  );
};

const PermissionTogglesCard = ({ permissions, onToggle, togglingPerm, colors }) => {
  const toggles = [
    {
      key: 'closet',
      label: 'My Closet',
      description: 'Let expert view, add items, and edit your closet',
      icon: <CheckroomOutlined sx={{ fontSize: 20 }} />,
    },
    {
      key: 'outfits',
      label: 'My Outfits',
      description: 'Let expert view and create outfits for you',
      icon: <StyleOutlined sx={{ fontSize: 20 }} />,
    },
  ];

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-1">
        Share with Expert
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Your style profile is always visible to your expert. Control additional access below.
      </p>
      <div className="space-y-3">
        {toggles.map((t) => (
          <div
            key={t.key}
            className="flex items-center justify-between p-4 rounded-xl"
            style={{
              backgroundColor: permissions[t.key]
                ? toRgba(colors.fourth, 0.05)
                : undefined,
              border: permissions[t.key]
                ? `1px solid ${toRgba(colors.fourth, 0.2)}`
                : '1px solid transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: permissions[t.key]
                    ? toRgba(colors.fourth, 0.1)
                    : 'rgba(156,163,175,0.1)',
                  color: permissions[t.key] ? colors.fourth : '#9ca3af',
                }}
              >
                {t.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                  {t.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
              </div>
            </div>
            <Switch
              checked={permissions[t.key] || false}
              onChange={() => onToggle(t.key)}
              disabled={togglingPerm === t.key}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: colors.fourth },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: colors.fourth,
                },
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ExpertTabs = ({ activeTab, setActiveTab, permissions, sessionActive, colors }) => {
  const tabs = [
    { key: 'profile', label: 'Profile', icon: <PersonOutlined sx={{ fontSize: 16 }} /> },
    ...(sessionActive ? [
      {
        key: 'closet',
        label: 'Closet',
        icon: <CheckroomOutlined sx={{ fontSize: 16 }} />,
        locked: !permissions?.closet,
      },
      {
        key: 'outfits',
        label: 'Outfits',
        icon: <StyleOutlined sx={{ fontSize: 16 }} />,
        locked: !permissions?.outfits,
      },
    ] : []),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            activeTab === tab.key
              ? 'text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-primary border border-gray-200 dark:border-gray-700'
          }`}
          style={
            activeTab === tab.key ? { backgroundColor: colors.fourth } : {}
          }
        >
          {tab.icon}
          {tab.label}
          {tab.locked && <LockOutlined sx={{ fontSize: 14 }} className="ml-1 opacity-60" />}
        </button>
      ))}
    </div>
  );
};

const ExpertTabContent = ({ activeTab, detail, bookingId, clientCloset, clientOutfits, permissions, sessionActive, colors }) => {
  // Past bookings: only profile tab is available
  if (!sessionActive || activeTab === 'profile') {
    return <StyleProfileTab detail={detail} colors={colors} />;
  }

  if (activeTab === 'closet') {
    if (!permissions?.closet) {
      return <LockedTab label="Closet" colors={colors} />;
    }
    return <ClientClosetView bookingId={bookingId} items={clientCloset} colors={colors} />;
  }

  if (activeTab === 'outfits') {
    if (!permissions?.outfits) {
      return <LockedTab label="Outfits" colors={colors} />;
    }
    return (
      <OutfitsTab
        outfits={clientOutfits}
        bookingId={bookingId}
        clientCloset={clientCloset}
        permissions={permissions}
        colors={colors}
      />
    );
  }

  return null;
};

const LockedTab = ({ label, colors }) => (
  <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
    <div
      className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
      style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
    >
      <LockOutlined sx={{ fontSize: 28 }} style={{ color: colors.fourth }} />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
      {label} Not Shared
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400">
      The client hasn't shared their {label.toLowerCase()} yet. They can enable access from their booking page.
    </p>
  </div>
);

const StyleProfileTab = ({ detail, colors }) => {
  const sp = detail?.styleProfile;
  const client = detail?.client;
  const closetSummary = detail?.closetSummary;

  return (
    <div className="space-y-6">
      {/* Profile Photos */}
      {client?.allPhotos?.length > 0 && (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-3">
            Profile Photos
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {client.allPhotos.map((photo, i) => (
              <img
                key={i}
                src={photo.url || photo.thumbnail_url}
                alt={`Photo ${i + 1}`}
                className="w-24 h-32 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        </div>
      )}

      {/* Style Profile Fields */}
      {sp ? (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-4">
            Style Profile
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PROFILE_SECTIONS.map((sec) => {
              const value = sp[sec.key];
              if (!value) return null;
              return (
                <div
                  key={sec.key}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    {sec.icon} {sec.label}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Client hasn't set up their style profile yet.
          </p>
        </div>
      )}

      {/* Measurements */}
      {sp && (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-4">
            <StraightenOutlined sx={{ fontSize: 18 }} className="mr-1.5 align-text-bottom" />
            Measurements
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {MEASUREMENT_FIELDS.map((f) => {
              const value = getNestedValue(sp, f.key);
              if (!value) return null;
              return (
                <div key={f.key} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{f.label}</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                    {value}
                    <span className="text-xs font-normal text-gray-400 ml-1">{f.unit}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Closet Summary */}
      {closetSummary && (
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text mb-3">
            <CheckroomOutlined sx={{ fontSize: 18 }} className="mr-1.5 align-text-bottom" />
            Closet Summary ({closetSummary.totalItems} items)
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(closetSummary.byType).map(([type, count]) => (
              <span
                key={type}
                className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.1),
                  color: colors.fourth,
                }}
              >
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const OCCASION_OPTIONS = ['Casual', 'Office', 'Party', 'Date Night', 'Wedding', 'Festive', 'Travel', 'Sports', 'Lounge'];
const SEASON_OPTIONS = ['Summer', 'Winter', 'Monsoon', 'All'];

const OutfitsTab = ({ outfits, bookingId, clientCloset, permissions, colors }) => {
  const dispatch = useDispatch();
  const [creating, setCreating] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [outfitName, setOutfitName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [season, setSeason] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch closet items when entering creation mode (expert needs closet permission too)
  useEffect(() => {
    if (creating && permissions?.closet && clientCloset.length === 0) {
      dispatch(fetchClientCloset(bookingId));
    }
  }, [creating, permissions?.closet, clientCloset.length, bookingId, dispatch]);

  const toggleItem = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i._id === item._id);
      if (exists) return prev.filter((i) => i._id !== item._id);
      return [...prev, item];
    });
  };

  const handleSave = async () => {
    if (selectedItems.length < 2) return;

    setSaving(true);
    const success = await dispatch(
      createClientOutfit(bookingId, {
        itemIds: selectedItems.map((i) => i._id),
        name: outfitName || 'Expert Outfit',
        occasion: occasion || undefined,
        season: season || undefined,
      })
    );
    setSaving(false);
    if (success) {
      setCreating(false);
      setSelectedItems([]);
      setOutfitName('');
      setOccasion('');
      setSeason('');
    }
  };

  // ── Create Outfit Mode ──
  if (creating) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
              Create Outfit
            </h3>
            <button
              onClick={() => { setCreating(false); setSelectedItems([]); }}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
              <CloseOutlined sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Outfit Name */}
          <input
            type="text"
            placeholder="Outfit name (optional)"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm mb-3"
          />

          {/* Occasion Pills */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Occasion</p>
            <div className="flex flex-wrap gap-1.5">
              {OCCASION_OPTIONS.map((occ) => (
                <button
                  key={occ}
                  onClick={() => setOccasion(occasion === occ ? '' : occ)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    occasion === occ
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                  }`}
                  style={occasion === occ ? { backgroundColor: colors.fourth } : {}}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Season Pills */}
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Season</p>
            <div className="flex gap-1.5">
              {SEASON_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeason(season === s ? '' : s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    season === s
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
                  }`}
                  style={season === s ? { backgroundColor: colors.fourth } : {}}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Selected count + Save */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              {selectedItems.length > 0 && selectedItems.length < 2 && (
                <span className="text-red-500 ml-1">(min 2)</span>
              )}
            </p>
            <button
              onClick={handleSave}
              disabled={selectedItems.length < 2 || saving}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-40"
              style={{ backgroundColor: colors.fourth }}
            >
              {saving ? 'Saving...' : 'Save Outfit'}
            </button>
          </div>
        </div>

        {/* Item Picker Grid */}
        {!permissions?.closet ? (
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <LockOutlined sx={{ fontSize: 32 }} className="text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Client needs to share closet access to create outfits from their items.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text mb-3">
              Select items for this outfit
            </p>
            {clientCloset.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                No items in client's closet.
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {clientCloset.map((item) => {
                  const isSelected = selectedItems.some((i) => i._id === item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleItem(item)}
                      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'border-current shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      style={isSelected ? { borderColor: colors.fourth } : {}}
                    >
                      <img
                        src={item.nobgUrl || item.thumbnailUrl || item.photoUrl}
                        alt={item.subcategory}
                        className="w-full h-24 object-cover"
                      />
                      {isSelected && (
                        <div
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.fourth }}
                        >
                          <CheckCircleOutlined sx={{ fontSize: 14 }} className="text-white" />
                        </div>
                      )}
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 px-1 py-0.5 truncate">
                        {item.subcategory} ({item.type})
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Normal Outfits List ──
  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
          Client's Outfits ({outfits?.length || 0})
        </h3>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.fourth }}
        >
          <AddOutlined sx={{ fontSize: 16 }} />
          Create Outfit
        </button>
      </div>

      {!outfits || outfits.length === 0 ? (
        <div className="text-center py-8">
          <StyleOutlined className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 48 }} />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No outfits yet.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            Create First Outfit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {outfits.map((outfit) => (
            <div
              key={outfit._id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {outfit.flatlayUrl ? (
                <img
                  src={outfit.flatlayUrl}
                  alt={outfit.name}
                  className="w-full h-40 object-cover bg-amber-50"
                />
              ) : outfit.items?.length > 0 ? (
                <div className="w-full h-40 grid grid-cols-2 gap-0.5 bg-gray-100 dark:bg-gray-800">
                  {outfit.items.slice(0, 4).map((item, i) => (
                    <img
                      key={item._id || i}
                      src={item.nobgUrl || item.thumbnailUrl || item.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <StyleOutlined className="text-gray-300" sx={{ fontSize: 40 }} />
                </div>
              )}
              <div className="p-2">
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text truncate">
                  {outfit.name || 'Untitled'}
                </p>
                <div className="flex items-center gap-2">
                  {outfit.occasion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{outfit.occasion}</p>
                  )}
                  {outfit.source === 'expert' && (
                    <span className="px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-[9px] font-medium text-yellow-700 dark:text-yellow-400">
                      Expert
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingDetail;
