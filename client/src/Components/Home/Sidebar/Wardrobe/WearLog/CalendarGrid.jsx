import React, { useMemo } from "react";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { IconButton } from "@mui/material";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function CalendarGrid({ year, month, wearHistory = [], plannedWears = [], outfits = [], onPrevMonth, onNextMonth, onDayClick }) {
  const colors = useSubscriptionColors();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Build a map of day → entries (with outfit thumbnail lookup)
  const dayMap = useMemo(() => {
    const map = {};
    const outfitMap = {};
    outfits.forEach((o) => { outfitMap[o._id] = o; });

    wearHistory.forEach((entry) => {
      const d = new Date(entry.wornAt || entry.createdAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        const outfitRef = entry.outfit?._id || entry.outfitId || entry.outfit;
        const outfit = typeof outfitRef === 'object' ? outfitRef : outfitMap[outfitRef];
        map[day].push({
          ...entry,
          outfitName: outfit?.name,
          thumb: outfit?.flatlayUrl || getItemThumb(outfit),
        });
      }
    });
    return map;
  }, [wearHistory, outfits, year, month]);

  // Build a set of days that have planned wears
  const plannedDayMap = useMemo(() => {
    const map = {};
    const outfitMap = {};
    outfits.forEach((o) => { outfitMap[o._id] = o; });

    plannedWears.forEach((entry) => {
      if (!entry.plannedFor) return;
      const d = new Date(entry.plannedFor);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        const outfit = entry.outfit && typeof entry.outfit === 'object'
          ? entry.outfit
          : outfitMap[entry.outfit];
        map[day].push({
          ...entry,
          outfitName: outfit?.name,
          thumb: outfit?.flatlayUrl || getItemThumb(outfit),
        });
      }
    });
    return map;
  }, [plannedWears, outfits, year, month]);

  // Count total entries this month
  const monthTotal = Object.values(dayMap).reduce((acc, arr) => acc + arr.length, 0);
  const plannedTotal = Object.values(plannedDayMap).reduce((acc, arr) => acc + arr.length, 0);

  // Allow navigating to future months if there are planned wears
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  // Only block forward if current month AND no planned wears in future months
  const hasAnyFuturePlans = plannedWears.some((p) => {
    const d = new Date(p.plannedFor);
    return d > today;
  });
  const disableNext = isCurrentMonth && !hasAnyFuturePlans;

  const cells = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="aspect-square" />);
  }
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const entries = dayMap[d] || [];
    const planned = plannedDayMap[d] || [];
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const hasEntries = entries.length > 0;
    const hasPlanned = planned.length > 0;
    const thumb = entries[0]?.thumb || planned[0]?.thumb;

    cells.push(
      <button
        key={d}
        onClick={() => onDayClick?.(d, entries.length > 0 ? entries : planned)}
        className={`aspect-square rounded-xl text-[10px] flex flex-col items-center justify-center transition-all relative overflow-hidden
          ${hasEntries || hasPlanned ? "cursor-pointer hover:shadow-md hover:scale-[1.04]" : "hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"}`}
        style={{
          backgroundColor: hasEntries
            ? toRgba(colors.fourth, 0.12)
            : hasPlanned
              ? toRgba(colors.fourth, 0.05)
              : undefined,
          boxShadow: isToday
            ? `inset 0 0 0 2px ${colors.fourth}`
            : hasPlanned && !hasEntries
              ? `inset 0 0 0 1.5px ${toRgba(colors.fourth, 0.3)}`
              : undefined,
          // Dashed border effect for planned days
          ...(hasPlanned && !hasEntries ? { borderStyle: "dashed" } : {}),
        }}
      >
        {/* Tiny outfit thumbnail on logged/planned days */}
        {(hasEntries || hasPlanned) && thumb && (
          <img
            src={thumb}
            alt=""
            className={`absolute inset-0 w-full h-full object-contain p-1 ${hasEntries ? "opacity-25" : "opacity-15"}`}
            loading="lazy"
          />
        )}
        <span
          className={`font-semibold relative z-[1] ${hasEntries || hasPlanned ? "" : "dark:text-dark-text/60 text-light-text/60"}`}
          style={isToday || hasEntries ? { color: colors.fourth } : hasPlanned ? { color: toRgba(colors.fourth, 0.6) } : {}}
        >
          {d}
        </span>
        {/* Dots: solid for worn, hollow for planned */}
        {(hasEntries || hasPlanned) && (
          <div className="flex gap-[2px] relative z-[1]">
            {entries.slice(0, 3).map((_, idx) => (
              <div
                key={`w-${idx}`}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: colors.fourth }}
              />
            ))}
            {!hasEntries && planned.slice(0, 3).map((_, idx) => (
              <div
                key={`p-${idx}`}
                className="w-1.5 h-1.5 rounded-full border"
                style={{ borderColor: toRgba(colors.fourth, 0.5), backgroundColor: "transparent" }}
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
          <ChevronLeft style={{ color: colors.fourth, fontSize: 20 }} />
        </IconButton>
        <div className="text-center">
          <span className="text-sm font-bold dark:text-dark-text/85 text-light-text/85">
            {monthName} {year}
          </span>
          <div className="flex items-center justify-center gap-2">
            {monthTotal > 0 && (
              <span className="text-[9px] dark:text-dark-text/35 text-light-text/35">
                {monthTotal} logged
              </span>
            )}
            {plannedTotal > 0 && (
              <span className="text-[9px]" style={{ color: toRgba(colors.fourth, 0.5) }}>
                {plannedTotal} planned
              </span>
            )}
          </div>
        </div>
        <IconButton onClick={onNextMonth} size="small" disabled={disableNext}>
          <ChevronRight style={{ color: disableNext ? toRgba(colors.fourth, 0.3) : colors.fourth, fontSize: 20 }} />
        </IconButton>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((dl, i) => (
          <div key={i} className="text-center text-[9px] font-semibold dark:text-dark-text/35 text-light-text/35">
            {dl}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>

      {/* Legend */}
      {(monthTotal > 0 || plannedTotal > 0) && (
        <div className="flex items-center justify-center gap-4 mt-3">
          {monthTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.fourth }} />
              <span className="text-[8px] dark:text-dark-text/40 text-light-text/40">Worn</span>
            </div>
          )}
          {plannedTotal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full border" style={{ borderColor: toRgba(colors.fourth, 0.5) }} />
              <span className="text-[8px] dark:text-dark-text/40 text-light-text/40">Planned</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getItemThumb(outfit) {
  if (!outfit) return null;
  const items = outfit.items || [];
  for (const i of items) {
    const resolved = i.clothingItem || i;
    if (resolved?.nobgUrl) return resolved.nobgUrl;
    if (resolved?.thumbnailUrl) return resolved.thumbnailUrl;
    if (resolved?.photoUrl) return resolved.photoUrl;
  }
  return null;
}

export default CalendarGrid;
