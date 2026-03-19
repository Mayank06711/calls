import React from "react";
import { motion } from "framer-motion";
import {
  StarRounded,
  FiberManualRecord,
  WorkOutlineOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { toRgba } from "../../../../utils/getSubscriptionColors";

function ExpertCard({ expert, colors, index = 0 }) {
  const navigate = useNavigate();

  const initials = (expert.fullName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      onClick={() => navigate(`/stylist/experts/${expert.expertId}`)}
      className="relative rounded-xl p-3.5 cursor-pointer dark:bg-dark-primary bg-light-secondary hover:shadow-md transition-shadow"
      style={{ border: `1px solid ${toRgba(colors.fourth, 0.1)}` }}
    >
      {/* Online indicator */}
      {expert.isOnline && (
        <div className="absolute top-3 right-3">
          <FiberManualRecord style={{ color: "#22c55e", fontSize: 10 }} />
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {expert.profilePhoto ? (
            <img
              src={expert.profilePhoto}
              alt={expert.fullName}
              className="w-14 h-14 rounded-xl object-cover"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold text-white"
              style={{
                background: `linear-gradient(135deg, ${colors.fourth}, ${toRgba(colors.fourth, 0.7)})`,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold dark:text-dark-text text-light-text truncate">
            {expert.fullName}
          </h4>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-0.5">
            <StarRounded style={{ color: "#facc15", fontSize: 14 }} />
            <span className="text-xs font-medium dark:text-dark-text/70 text-light-text/70">
              {expert.rating.averageRating > 0
                ? expert.rating.averageRating.toFixed(1)
                : "New"}
            </span>
            {expert.rating.totalRatings > 0 && (
              <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                ({expert.rating.totalRatings})
              </span>
            )}
          </div>

          {/* Experience */}
          <div className="flex items-center gap-1 mt-1">
            <WorkOutlineOutlined
              style={{ fontSize: 12 }}
              className="dark:text-dark-text/40 text-light-text/40"
            />
            <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">
              {expert.experienceInYears}+ yrs
            </span>
          </div>
        </div>
      </div>

      {/* Specializations */}
      {expert.specializations?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {expert.specializations.slice(0, 3).map((spec) => (
            <span
              key={spec}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.1),
                color: colors.fourth,
              }}
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      {/* Pricing */}
      {expert.pricing?.per30Min > 0 && (
        <div
          className="mt-2.5 pt-2.5 flex items-center justify-between"
          style={{ borderTop: `1px solid ${toRgba(colors.fourth, 0.08)}` }}
        >
          <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">
            From
          </span>
          <span className="text-xs font-bold" style={{ color: colors.fourth }}>
            {expert.pricing.per15Min > 0
              ? `${expert.pricing.per15Min} credits / 15 min`
              : `${expert.pricing.per30Min} credits / 30 min`}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default ExpertCard;
