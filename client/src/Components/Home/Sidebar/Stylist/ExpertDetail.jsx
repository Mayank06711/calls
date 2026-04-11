import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowBack,
  FiberManualRecord,
  WorkOutlineOutlined,
  PeopleOutlined,
  SchoolOutlined,
  BoltOutlined,
  CalendarMonthOutlined,
  StarRounded,
} from "@mui/icons-material";
import { Button, CircularProgress } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  useSubscriptionColors,
  toRgba,
} from "../../../../utils/getSubscriptionColors";
import { fetchExpertDetail } from "../../../../redux/thunks/expert.thunks";
import { clearExpertDetail } from "../../../../redux/actions/expert.actions";
import { fetchCreditBalance } from "../../../../redux/thunks/booking.thunks";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import { useInstantExpert } from "../../../../hooks/useInstantExpert";
import RatingBreakdown from "./RatingBreakdown";
import ReviewCard from "./ReviewCard";
import BookingModal from "./BookingModal";

const PRICING_TIERS = [
  { key: "per15Min", label: "15 min", duration: 15 },
  { key: "per30Min", label: "30 min", duration: 30, popular: true },
  { key: "per60Min", label: "60 min", duration: 60 },
];

function ExpertDetail() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { expertId } = useParams();

  const detail = useSelector((s) => s.expertCatalog.detail);
  const isLoading = useSelector(
    (s) => s.loaderState.loaders[LOADER_TYPES.EXPERT_DETAIL]
  );

  const { findExpert, loading: instantLoading } = useInstantExpert();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDuration, setBookingDuration] = useState(null);

  useEffect(() => {
    if (expertId) dispatch(fetchExpertDetail(expertId));
    dispatch(fetchCreditBalance());
    return () => dispatch(clearExpertDetail());
  }, [expertId, dispatch]);

  const expert = detail?.expert;
  const ratingBreakdown = detail?.ratingBreakdown;
  const reviews = detail?.reviews || [];

  if (isLoading || !expert) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Skeleton header */}
        <div
          className="flex-shrink-0 px-4 sm:px-5 pt-3 pb-2.5"
          style={{
            background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 100%)`,
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
              }}
            >
              <ArrowBack style={{ color: "#fff", fontSize: 20 }} />
            </button>
            <div className="h-4 w-32 rounded animate-pulse dark:bg-dark-text/10 bg-light-text/10" />
          </div>
        </div>
        <div className="flex-1 p-5 space-y-4">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl animate-pulse dark:bg-dark-text/10 bg-light-text/10" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 rounded animate-pulse dark:bg-dark-text/10 bg-light-text/10" />
              <div className="h-3 w-24 rounded animate-pulse dark:bg-dark-text/10 bg-light-text/10" />
              <div className="h-3 w-full rounded animate-pulse dark:bg-dark-text/10 bg-light-text/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = (expert.fullName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasPricing =
    expert.pricing?.per15Min > 0 ||
    expert.pricing?.per30Min > 0 ||
    expert.pricing?.per60Min > 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)} 0%, transparent 50%, ${toRgba(colors.fourth, 0.05)} 100%)`,
        }}
      >
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl"
          style={{ backgroundColor: toRgba(colors.fourth, 0.07) }}
        />
        <div className="relative px-4 sm:px-5 pt-3 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/10 transition-colors"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                boxShadow: `0 3px 10px ${toRgba(colors.fourth, 0.25)}`,
              }}
            >
              <ArrowBack style={{ color: "#fff", fontSize: 20 }} />
            </button>
            <h2 className="text-base font-bold dark:text-dark-text text-light-text tracking-tight truncate">
              {expert.fullName}
            </h2>
          </div>
        </div>
        <div
          className="h-[2px]"
          style={{
            background: `linear-gradient(to right, ${colors.fourth}, ${toRgba(colors.fourth, 0.2)}, transparent)`,
          }}
        />
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 sm:px-5 pt-5 pb-6 space-y-5">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex gap-4"
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {expert.profilePhoto ? (
              <img
                src={expert.profilePhoto}
                alt={expert.fullName}
                className="w-20 h-20 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
                }}
              >
                {initials}
              </div>
            )}
            {expert.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 dark:border-dark-bg border-light-bg flex items-center justify-center">
                <FiberManualRecord style={{ color: "#fff", fontSize: 8 }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold dark:text-dark-text text-light-text">
              {expert.fullName}
            </h3>
            {expert.username && (
              <p className="text-xs dark:text-dark-text/40 text-light-text/40">
                @{expert.username}
              </p>
            )}
            {expert.bio && (
              <p className="text-xs dark:text-dark-text/60 text-light-text/60 mt-1.5 leading-relaxed line-clamp-3">
                {expert.bio}
              </p>
            )}
          </div>
        </motion.div>

        {/* Info Badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="flex flex-wrap gap-2"
        >
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
          >
            <WorkOutlineOutlined style={{ fontSize: 14, color: colors.fourth }} />
            <span className="text-[11px] font-medium dark:text-dark-text/70 text-light-text/70">
              {expert.experienceInYears}+ yrs
            </span>
          </div>
          {expert.totalCustomersHandled > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
            >
              <PeopleOutlined style={{ fontSize: 14, color: colors.fourth }} />
              <span className="text-[11px] font-medium dark:text-dark-text/70 text-light-text/70">
                {expert.totalCustomersHandled} clients
              </span>
            </div>
          )}
          {expert.qualification && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: toRgba(colors.fourth, 0.08) }}
            >
              <SchoolOutlined style={{ fontSize: 14, color: colors.fourth }} />
              <span className="text-[11px] font-medium dark:text-dark-text/70 text-light-text/70 truncate max-w-[140px]">
                {expert.qualification}
              </span>
            </div>
          )}
        </motion.div>

        {/* Specializations */}
        {expert.specializations?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="flex flex-wrap gap-1.5"
          >
            {expert.specializations.map((spec) => (
              <span
                key={spec}
                className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: toRgba(colors.fourth, 0.12),
                  color: colors.fourth,
                }}
              >
                {spec}
              </span>
            ))}
          </motion.div>
        )}

        {/* Pricing Table */}
        {hasPricing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="rounded-xl p-4 dark:bg-dark-primary bg-light-secondary"
            style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
          >
            <h4 className="text-xs font-bold uppercase tracking-widest dark:text-dark-text/40 text-light-text/40 mb-3">
              Session Pricing
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {PRICING_TIERS.map(({ key, label, duration, popular }) => {
                const credits = expert.pricing?.[key] || 0;
                if (credits === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setBookingDuration(duration);
                      setBookingOpen(true);
                    }}
                    className="relative rounded-xl p-3 text-center cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md"
                    style={{
                      backgroundColor: popular
                        ? toRgba(colors.fourth, 0.12)
                        : toRgba(colors.fourth, 0.05),
                      border: popular
                        ? `1.5px solid ${toRgba(colors.fourth, 0.3)}`
                        : `1px solid ${toRgba(colors.fourth, 0.08)}`,
                    }}
                  >
                    {popular && (
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: colors.fourth }}
                      >
                        POPULAR
                      </div>
                    )}
                    <p className="text-[10px] dark:text-dark-text/50 text-light-text/50 mt-1">
                      {label}
                    </p>
                    <p
                      className="text-lg font-bold mt-1"
                      style={{ color: colors.fourth }}
                    >
                      {credits}
                    </p>
                    <p className="text-[9px] dark:text-dark-text/40 text-light-text/40">
                      credits
                    </p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Rating Breakdown */}
        {ratingBreakdown && ratingBreakdown.totalRatings > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="rounded-xl p-4 dark:bg-dark-primary bg-light-secondary"
            style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
          >
            <h4 className="text-xs font-bold uppercase tracking-widest dark:text-dark-text/40 text-light-text/40 mb-3">
              Ratings & Reviews
            </h4>
            <RatingBreakdown ratingData={ratingBreakdown} colors={colors} />
          </motion.div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.35 }}
            className="space-y-2"
          >
            <h4 className="text-xs font-bold uppercase tracking-widest dark:text-dark-text/40 text-light-text/40">
              Recent Reviews
            </h4>
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                colors={colors}
              />
            ))}
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="space-y-2.5 pt-2"
        >
          {/* Instant Connect (if online) */}
          {expert.isOnline && (
            <Button
              fullWidth
              variant="contained"
              startIcon={
                instantLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <BoltOutlined />
                )
              }
              onClick={() => !instantLoading && findExpert("clothing")}
              disabled={instantLoading}
              sx={{
                backgroundColor: colors.fourth,
                "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) },
                "&.Mui-disabled": {
                  backgroundColor: toRgba(colors.fourth, 0.6),
                  color: "rgba(255,255,255,0.8)",
                },
                borderRadius: "0.75rem",
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
                boxShadow: `0 4px 14px ${toRgba(colors.fourth, 0.3)}`,
              }}
            >
              {instantLoading ? "Connecting..." : "Instant Connect"}
            </Button>
          )}

          {/* Book Appointment */}
          {hasPricing && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<CalendarMonthOutlined />}
              onClick={() => {
                setBookingDuration(null);
                setBookingOpen(true);
              }}
              sx={{
                borderColor: toRgba(colors.fourth, 0.5),
                color: colors.fourth,
                "&:hover": {
                  borderColor: colors.fourth,
                  backgroundColor: toRgba(colors.fourth, 0.08),
                },
                borderRadius: "0.75rem",
                textTransform: "none",
                fontWeight: 600,
                py: 1.5,
              }}
            >
              Book Appointment
            </Button>
          )}
        </motion.div>
      </div>

      {/* Booking Modal */}
      {expert && (
        <BookingModal
          open={bookingOpen}
          onClose={() => {
            setBookingOpen(false);
            setBookingDuration(null);
          }}
          expert={{
            expertId: expert.expertId,
            fullName: expert.fullName,
            pricing: expert.pricing,
          }}
          colors={colors}
          initialDuration={bookingDuration}
        />
      )}
    </div>
  );
}

export default ExpertDetail;
