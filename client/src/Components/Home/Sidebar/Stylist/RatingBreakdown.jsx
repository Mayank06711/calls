import React from "react";
import { StarRounded } from "@mui/icons-material";
import { toRgba } from "../../../../utils/getSubscriptionColors";

const STAR_KEYS = [
  { level: 5, key: "fiveStarCount" },
  { level: 4, key: "fourStarCount" },
  { level: 3, key: "threeStarCount" },
  { level: 2, key: "twoStarCount" },
  { level: 1, key: "oneStarCount" },
];

function RatingBreakdown({ ratingData, colors }) {
  if (!ratingData) return null;

  const { averageRating = 0, totalRatings = 0 } = ratingData;

  return (
    <div className="flex gap-4">
      {/* Left: Big number */}
      <div className="flex flex-col items-center justify-center min-w-[72px]">
        <span
          className="text-3xl font-bold"
          style={{ color: colors.fourth }}
        >
          {averageRating > 0 ? averageRating.toFixed(1) : "—"}
        </span>
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <StarRounded
              key={s}
              style={{
                fontSize: 12,
                color:
                  s <= Math.round(averageRating)
                    ? "#facc15"
                    : "rgba(150,150,150,0.3)",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] dark:text-dark-text/40 text-light-text/40 mt-1">
          {totalRatings} {totalRatings === 1 ? "review" : "reviews"}
        </span>
      </div>

      {/* Right: Bars */}
      <div className="flex-1 space-y-1.5 py-0.5">
        {STAR_KEYS.map(({ level, key }) => {
          const count = ratingData[key] || 0;
          const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          return (
            <div key={level} className="flex items-center gap-2">
              <span className="text-[10px] w-3 text-right dark:text-dark-text/50 text-light-text/50">
                {level}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden dark:bg-dark-text/10 bg-light-text/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colors.fourth,
                  }}
                />
              </div>
              <span className="text-[10px] w-5 dark:text-dark-text/40 text-light-text/40">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RatingBreakdown;
