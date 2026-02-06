import React from "react";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton } from "@mui/material";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarGrid({ year, month, wearHistory = [], onPrevMonth, onNextMonth, onDayClick }) {
  const colors = useSubscriptionColors();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Build a map of day → entries
  const dayMap = {};
  wearHistory.forEach((entry) => {
    const d = new Date(entry.wornAt || entry.createdAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(entry);
    }
  });

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const entries = dayMap[d] || [];
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const hasEntries = entries.length > 0;

    cells.push(
      <button
        key={d}
        onClick={() => onDayClick?.(d, entries)}
        className={`aspect-square rounded-lg text-[10px] flex flex-col items-center justify-center gap-0.5 transition-all relative
          ${isToday ? "ring-2" : ""} ${hasEntries ? "cursor-pointer hover:shadow-sm" : ""}`}
        style={{
          backgroundColor: hasEntries ? `${colors.fourth}15` : "transparent",
          ringColor: isToday ? colors.fourth : undefined,
        }}
      >
        <span className={`font-medium ${isToday ? "" : "dark:text-dark-text/70 text-light-text/70"}`}
          style={isToday ? { color: colors.fourth } : {}}
        >
          {d}
        </span>
        {hasEntries && (
          <div className="flex gap-0.5">
            {entries.slice(0, 3).map((_, idx) => (
              <div
                key={idx}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: colors.fourth }}
              />
            ))}
          </div>
        )}
      </button>
    );
  }

  const monthName = new Date(year, month).toLocaleString("default", { month: "long" });

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <IconButton onClick={onPrevMonth} size="small">
          <ChevronLeft style={{ color: colors.fourth }} />
        </IconButton>
        <span className="text-sm font-semibold dark:text-dark-text/80 text-light-text/80">
          {monthName} {year}
        </span>
        <IconButton onClick={onNextMonth} size="small">
          <ChevronRight style={{ color: colors.fourth }} />
        </IconButton>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((dl) => (
          <div key={dl} className="text-center text-[9px] font-medium dark:text-dark-text/40 text-light-text/40">
            {dl}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>
    </div>
  );
}

export default CalendarGrid;
