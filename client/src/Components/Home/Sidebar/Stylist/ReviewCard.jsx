import React, { useState } from "react";
import { StarRounded } from "@mui/icons-material";
import { toRgba } from "../../../../utils/getSubscriptionColors";

function ReviewCard({ review, colors }) {
  const [expanded, setExpanded] = useState(false);

  const initials = (review.user?.fullName || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  const isLong = review.message?.length > 150;

  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: toRgba(colors.fourth, 0.04) }}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        {review.user?.profilePhoto ? (
          <img
            src={review.user.profilePhoto}
            alt=""
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: toRgba(colors.fourth, 0.6) }}
          >
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold dark:text-dark-text text-light-text truncate">
              {review.user?.fullName || "Anonymous"}
            </span>
            <span className="text-[10px] dark:text-dark-text/30 text-light-text/30 flex-shrink-0 ml-2">
              {timeAgo(review.createdAt)}
            </span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <StarRounded
                key={s}
                style={{
                  fontSize: 12,
                  color: s <= review.stars ? "#facc15" : "rgba(150,150,150,0.3)",
                }}
              />
            ))}
          </div>

          {/* Aspects */}
          {review.aspects?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {review.aspects.map((a) => (
                <span
                  key={a}
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium dark:text-dark-text/50 text-light-text/50"
                  style={{
                    backgroundColor: toRgba(colors.fourth, 0.08),
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Message */}
          {review.message && (
            <p className="text-[11px] dark:text-dark-text/60 text-light-text/60 mt-1.5 leading-relaxed">
              {isLong && !expanded
                ? review.message.slice(0, 150) + "..."
                : review.message}
              {isLong && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="ml-1 font-medium"
                  style={{ color: colors.fourth }}
                >
                  {expanded ? "Less" : "More"}
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewCard;
