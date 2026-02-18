import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowBack, CalendarMonth, CheckCircle, LocalFireDepartment,
  TrendingUp, Checkroom, Close, EventNote, Delete,
  AccessTime, Visibility,
} from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import {
  fetchWearHistoryThunk,
  fetchWearStatsThunk,
  logWearThunk,
  fetchOutfitsThunk,
  fetchPlannedWearsThunk,
  markPlannedAsWornThunk,
  deletePlannedWearThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import PremiumGate from "../shared/PremiumGate";
import CalendarGrid from "./CalendarGrid";
import OutfitFlatLay from "../shared/OutfitFlatLay";

function WearLog() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, logging, history, stats } = useSelector((s) => s.wardrobe.wearLog);
  const { saved: outfits } = useSelector((s) => s.wardrobe.outfits);
  const { items: plannedWears } = useSelector((s) => s.wardrobe.plannedWears);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [loggedToday, setLoggedToday] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  // Plan-to-wear state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planOutfitId, setPlanOutfitId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planOccasion, setPlanOccasion] = useState("");
  const [planSaving, setPlanSaving] = useState(false);

  // Day detail popup
  const [dayDetail, setDayDetail] = useState(null); // { day, entries }

  useEffect(() => {
    dispatch(fetchWearHistoryThunk({ limit: 200 }));
    dispatch(fetchWearStatsThunk());
    dispatch(fetchPlannedWearsThunk());
    if (outfits.length === 0) dispatch(fetchOutfitsThunk());
  }, [dispatch, outfits.length]);

  useEffect(() => {
    dispatch(fetchWearHistoryThunk({ limit: 200 }));
  }, [dispatch, month, year]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    const hasToday = history.some((e) => {
      const d = new Date(e.wornAt || e.createdAt);
      return d.toDateString() === todayStr;
    });
    setLoggedToday(hasToday);
  }, [history]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleQuickLog = async (outfitId) => {
    if (!outfitId) return;
    await dispatch(logWearThunk({ outfitId, wornAt: new Date().toISOString() }));
    dispatch(fetchWearHistoryThunk({ limit: 200 }));
    dispatch(fetchWearStatsThunk());
  };

  const handleDayClick = useCallback((day, entries) => {
    if (entries.length === 0) return;
    if (entries.length === 1) {
      // Single outfit → navigate directly
      const entry = entries[0];
      const outfitId = entry.outfit?._id || entry.outfit || entry.outfitId;
      if (outfitId) navigate(`/wardrobe/outfits/${outfitId}`);
    } else {
      // Multiple outfits → show day detail popup
      setDayDetail({ day, entries });
    }
  }, [navigate]);

  const handlePlanSubmit = async () => {
    if (!planOutfitId || !planDate) return;
    setPlanSaving(true);
    await dispatch(logWearThunk({
      outfitId: planOutfitId,
      status: "planned",
      plannedFor: new Date(planDate).toISOString(),
      occasion: planOccasion || undefined,
    }));
    dispatch(fetchPlannedWearsThunk());
    setPlanSaving(false);
    setShowPlanModal(false);
    setPlanOutfitId("");
    setPlanDate("");
    setPlanOccasion("");
  };

  const handleMarkWorn = async (id) => {
    await dispatch(markPlannedAsWornThunk(id));
    dispatch(fetchWearHistoryThunk({ limit: 200 }));
    dispatch(fetchWearStatsThunk());
  };

  const handleDeletePlan = async (id) => {
    await dispatch(deletePlannedWearThunk(id));
  };

  // Find recently created outfit (last 48h) that hasn't been logged today
  const recentOutfit = useMemo(() => {
    if (loggedToday || reminderDismissed || outfits.length === 0) return null;
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const todayStr = new Date().toDateString();
    const loggedIds = new Set(
      history
        .filter((e) => new Date(e.wornAt || e.createdAt).toDateString() === todayStr)
        .map((e) => e.outfit?._id || e.outfit || e.outfitId)
    );
    return outfits.find((o) => {
      const created = new Date(o.createdAt).getTime();
      return created > cutoff && !loggedIds.has(o._id);
    }) || null;
  }, [outfits, history, loggedToday, reminderDismissed]);

  // Today's planned wear
  const todaysPlan = useMemo(() => {
    const todayStr = new Date().toDateString();
    return plannedWears.find((p) => {
      const d = new Date(p.plannedFor);
      return d.toDateString() === todayStr;
    }) || null;
  }, [plannedWears]);

  // Upcoming plans
  const upcomingPlans = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return plannedWears.filter((p) => {
      const d = new Date(p.plannedFor);
      return d >= todayStart && d.toDateString() !== todayStr;
    });
  }, [plannedWears]);

  // Use backend streak (fallback to local calc for immediate feedback)
  const streak = useMemo(() => {
    if (stats?.currentStreak !== undefined) return stats.currentStreak;
    if (!history || history.length === 0) return 0;
    const dates = new Set(history.map((e) => new Date(e.wornAt || e.createdAt).toDateString()));
    let count = 0;
    const d = new Date();
    if (!dates.has(d.toDateString())) {
      d.setDate(d.getDate() - 1);
      if (!dates.has(d.toDateString())) return 0;
    }
    while (dates.has(d.toDateString())) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [history, stats]);

  // Stats
  const monthlyCount = stats?.totalWearsThisMonth ?? 0;
  const totalLogged = stats?.totalOutfitsWorn ?? 0;
  const topWorn = Array.isArray(stats?.mostWorn) ? stats.mostWorn[0] : stats?.mostWorn;

  const resolveItem = (outfit, type) => {
    const items = outfit?.items || [];
    const found = items.find((i) => (i.clothingItem?.type || i.type) === type);
    return found?.clothingItem || found || null;
  };

  const getOutfitThumb = (outfit) => {
    if (!outfit) return null;
    if (outfit.flatlayUrl) return outfit.flatlayUrl;
    const top = resolveItem(outfit, "Top");
    return top?.nobgUrl || top?.thumbnailUrl || top?.photoUrl || null;
  };

  return (
    <PremiumGate requiredTier="Silver" message="Outfit Log requires Silver or above">
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
          <div className="flex items-center justify-between pr-12">
            <div className="flex items-center gap-2">
              <IconButton onClick={() => navigate("/wardrobe")} size="small">
                <ArrowBack style={{ color: colors.fourth }} />
              </IconButton>
              <div>
                <h2 className="text-base font-bold dark:text-dark-text text-light-text">
                  Outfit Log
                </h2>
                <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 leading-relaxed">
                  Track what you wear, build your style history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {streak > 0 && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ backgroundColor: streak >= 7 ? "rgba(249,115,22,0.15)" : toRgba(colors.fourth, 0.1) }}
                >
                  <LocalFireDepartment style={{ fontSize: 14, color: streak >= 7 ? "#f97316" : colors.fourth }} />
                  <span className="text-[11px] font-bold" style={{ color: streak >= 7 ? "#f97316" : colors.fourth }}>
                    {streak}d
                  </span>
                </div>
              )}
              {loggedToday && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}>
                  <CheckCircle style={{ fontSize: 12, color: colors.fourth }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 space-y-3">

          {/* ── Today's Plan Reminder ── */}
          {todaysPlan && (
            <TodayPlanCard
              plan={todaysPlan}
              colors={colors}
              onMarkWorn={() => handleMarkWorn(todaysPlan._id)}
              onDismiss={() => handleDeletePlan(todaysPlan._id)}
              resolveItem={resolveItem}
              logging={logging}
            />
          )}

          {/* ── Wear Reminder ── */}
          {!todaysPlan && recentOutfit && (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: toRgba(colors.fourth, 0.2), background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.06)}, transparent)` }}
            >
              <div className="flex items-center justify-between p-3 pb-1">
                <p className="text-[11px] font-semibold dark:text-dark-text/70 text-light-text/70">
                  Did you wear this today?
                </p>
                <IconButton onClick={() => setReminderDismissed(true)} size="small">
                  <Close style={{ fontSize: 14 }} className="dark:text-dark-text/30 text-light-text/30" />
                </IconButton>
              </div>
              <div className="flex items-center gap-3 px-3 pb-3">
                <OutfitThumb outfit={recentOutfit} resolveItem={resolveItem} size={14} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
                    {recentOutfit.name || "Untitled Outfit"}
                  </p>
                </div>
                <button
                  onClick={() => handleQuickLog(recentOutfit._id)}
                  disabled={logging}
                  className="px-3.5 py-2 rounded-xl text-[11px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 hover:opacity-90"
                  style={{ backgroundColor: colors.fourth }}
                >
                  {logging ? <CircularProgress size={12} style={{ color: "#fff" }} /> : <CheckCircle style={{ fontSize: 14 }} />}
                  Yes
                </button>
              </div>
            </div>
          )}

          {/* ── Upcoming Plans ── */}
          {upcomingPlans.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold dark:text-dark-text/60 text-light-text/60 mb-1.5 flex items-center gap-1.5">
                <EventNote style={{ fontSize: 13, color: colors.fourth }} />
                Upcoming
              </p>
              <div className="space-y-1.5">
                {upcomingPlans.slice(0, 3).map((plan) => (
                  <PlannedWearCard
                    key={plan._id}
                    plan={plan}
                    colors={colors}
                    onMarkWorn={() => handleMarkWorn(plan._id)}
                    onDelete={() => handleDeletePlan(plan._id)}
                    resolveItem={resolveItem}
                    getOutfitThumb={getOutfitThumb}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Stats Cards ── */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<CalendarMonth style={{ fontSize: 16 }} />} label="This Month" value={monthlyCount} colors={colors} />
              <StatCard icon={<TrendingUp style={{ fontSize: 16 }} />} label="Total Logged" value={totalLogged} colors={colors} />
              <StatCard
                icon={<Checkroom style={{ fontSize: 16 }} />}
                label="Most Worn"
                value={topWorn?.wearCount || 0}
                sub={topWorn?.name}
                colors={colors}
              />
            </div>
          )}

          {/* ── Quick Log + Plan — ABOVE calendar ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold dark:text-dark-text/60 text-light-text/60">
                Log an outfit
              </p>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-[10px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full hover:opacity-80"
                style={{ color: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.1) }}
              >
                <EventNote style={{ fontSize: 11 }} />
                Plan to Wear
              </button>
            </div>
            {outfits.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: toRgba(colors.fourth, 0.2) }}>
                <Checkroom style={{ fontSize: 22, color: toRgba(colors.fourth, 0.3) }} />
                <p className="text-[10px] dark:text-dark-text/35 text-light-text/35 mt-1">
                  No saved outfits yet
                </p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar -mx-1 px-1">
                {outfits.slice(0, 20).map((outfit) => {
                  const topItem = resolveItem(outfit, "Top");
                  const bottomItem = resolveItem(outfit, "Bottom");
                  const thumb = outfit.flatlayUrl || topItem?.nobgUrl || topItem?.thumbnailUrl || topItem?.photoUrl;

                  return (
                    <button
                      key={outfit._id}
                      onClick={() => handleQuickLog(outfit._id)}
                      disabled={logging}
                      className="flex-shrink-0 w-[72px] rounded-xl overflow-hidden transition-all hover:shadow-md hover:scale-[1.03] disabled:opacity-40 border"
                      style={{ borderColor: toRgba(colors.fourth, 0.1) }}
                    >
                      <div className="w-full aspect-square flex items-center justify-center relative" style={{ backgroundColor: "#f5f5f0" }}>
                        {thumb ? (
                          <img src={thumb} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                        ) : (
                          <OutfitFlatLay top={topItem} bottom={bottomItem} size="sm" />
                        )}
                      </div>
                      <div className="px-1 py-1 dark:bg-dark-primary bg-white">
                        <p className="text-[7px] font-medium dark:text-dark-text/60 text-light-text/60 truncate text-center">
                          {outfit.name || "Untitled"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Calendar ── */}
          <div className="rounded-2xl border p-3 sm:p-4" style={{ borderColor: toRgba(colors.fourth, 0.15) }}>
            {loading ? (
              <div className="flex justify-center py-8">
                <CircularProgress size={24} style={{ color: colors.fourth }} />
              </div>
            ) : (
              <CalendarGrid
                year={year}
                month={month}
                wearHistory={history}
                plannedWears={plannedWears}
                outfits={outfits}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onDayClick={handleDayClick}
              />
            )}
          </div>

        </div>
      </div>

      {/* ── Day Detail Popup (multiple outfits on one day) ── */}
      {dayDetail && (
        <DayDetailPopup
          day={dayDetail.day}
          month={month}
          year={year}
          entries={dayDetail.entries}
          colors={colors}
          onClose={() => setDayDetail(null)}
          onViewOutfit={(outfitId) => { setDayDetail(null); navigate(`/wardrobe/outfits/${outfitId}`); }}
          resolveItem={resolveItem}
        />
      )}

      {/* ── Plan-to-Wear Modal ── */}
      {showPlanModal && (
        <PlanToWearModal
          outfits={outfits}
          colors={colors}
          planOutfitId={planOutfitId}
          setPlanOutfitId={setPlanOutfitId}
          planDate={planDate}
          setPlanDate={setPlanDate}
          planOccasion={planOccasion}
          setPlanOccasion={setPlanOccasion}
          saving={planSaving}
          onSubmit={handlePlanSubmit}
          onClose={() => setShowPlanModal(false)}
          resolveItem={resolveItem}
          getOutfitThumb={getOutfitThumb}
        />
      )}
    </PremiumGate>
  );
}

/* ══════════════════════════════════════════════════════════════
   Outfit Thumbnail Helper
   ══════════════════════════════════════════════════════════════ */

function OutfitThumb({ outfit, resolveItem, size = 14 }) {
  const thumb = outfit?.flatlayUrl;
  const topItem = resolveItem(outfit, "Top");
  const bottomItem = resolveItem(outfit, "Bottom");

  return (
    <div
      className={`w-${size} h-${size} rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: "#f5f5f0", width: size * 4, height: size * 4 }}
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" />
      ) : (
        <OutfitFlatLay top={topItem} bottom={bottomItem} size="sm" />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Day Detail Popup — shows ALL outfits worn on a given day
   ══════════════════════════════════════════════════════════════ */

function DayDetailPopup({ day, month, year, entries, colors, onClose, onViewOutfit, resolveItem }) {
  const dateStr = new Date(year, month, day).toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm mx-auto bg-white dark:bg-dark-primary rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[60vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-2">
          <div>
            <h3 className="text-sm font-bold dark:text-dark-text text-light-text">{dateStr}</h3>
            <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
              {entries.length} outfit{entries.length !== 1 ? "s" : ""} logged
            </p>
          </div>
          <IconButton onClick={onClose} size="small">
            <Close style={{ fontSize: 18 }} className="dark:text-dark-text/50 text-light-text/50" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2">
          {entries.map((entry, idx) => {
            const outfit = entry.outfit && typeof entry.outfit === "object" ? entry.outfit : null;
            const outfitId = outfit?._id || entry.outfit || entry.outfitId;
            const thumb = outfit?.flatlayUrl || (outfit ? getItemThumbHelper(outfit) : null);

            return (
              <button
                key={idx}
                onClick={() => outfitId && onViewOutfit(outfitId)}
                className="w-full rounded-xl border flex items-center gap-3 p-2.5 text-left transition-all hover:shadow-sm"
                style={{ borderColor: toRgba(colors.fourth, 0.12) }}
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "#f5f5f0" }}>
                  {thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <OutfitFlatLay
                      top={resolveItem(outfit, "Top")}
                      bottom={resolveItem(outfit, "Bottom")}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
                    {entry.outfitName || outfit?.name || "Outfit"}
                  </p>
                  {entry.occasion && (
                    <p className="text-[9px] dark:text-dark-text/40 text-light-text/40">{entry.occasion}</p>
                  )}
                </div>
                <Visibility style={{ fontSize: 14 }} className="dark:text-dark-text/25 text-light-text/25 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getItemThumbHelper(outfit) {
  if (!outfit) return null;
  const items = outfit.items || [];
  for (const i of items) {
    const r = i.clothingItem || i;
    if (r?.nobgUrl) return r.nobgUrl;
    if (r?.thumbnailUrl) return r.thumbnailUrl;
    if (r?.photoUrl) return r.photoUrl;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   Today's Plan Reminder
   ══════════════════════════════════════════════════════════════ */

function TodayPlanCard({ plan, colors, onMarkWorn, onDismiss, resolveItem, logging }) {
  const outfit = plan.outfit;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: toRgba(colors.fourth, 0.25),
        background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.08)}, ${toRgba(colors.fourth, 0.02)})`,
      }}
    >
      <div className="flex items-center justify-between p-3 pb-1">
        <div className="flex items-center gap-2">
          <EventNote style={{ fontSize: 16, color: colors.fourth }} />
          <p className="text-[11px] font-bold" style={{ color: colors.fourth }}>
            You planned to wear this today!
          </p>
        </div>
        <IconButton onClick={onDismiss} size="small">
          <Close style={{ fontSize: 14 }} className="dark:text-dark-text/30 text-light-text/30" />
        </IconButton>
      </div>
      <div className="flex items-center gap-3 px-3 pb-3">
        <OutfitThumb outfit={outfit} resolveItem={resolveItem} size={14} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold dark:text-dark-text/80 text-light-text/80 truncate">
            {outfit?.name || "Untitled Outfit"}
          </p>
          {plan.occasion && (
            <p className="text-[9px] dark:text-dark-text/40 text-light-text/40">{plan.occasion}</p>
          )}
        </div>
        <button
          onClick={onMarkWorn}
          disabled={logging}
          className="px-3.5 py-2 rounded-xl text-[11px] font-semibold text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0 hover:opacity-90"
          style={{ backgroundColor: colors.fourth }}
        >
          <CheckCircle style={{ fontSize: 14 }} />
          I wore it
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Planned Wear Card (upcoming)
   ══════════════════════════════════════════════════════════════ */

function PlannedWearCard({ plan, colors, onMarkWorn, onDelete, resolveItem, getOutfitThumb }) {
  const outfit = plan.outfit;
  const thumb = getOutfitThumb(outfit);
  const topItem = resolveItem(outfit, "Top");
  const bottomItem = resolveItem(outfit, "Bottom");

  const plannedDate = new Date(plan.plannedFor);
  const dayLabel = plannedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const daysUntil = Math.ceil((plannedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const daysLabel = daysUntil === 1 ? "tomorrow" : `in ${daysUntil}d`;

  return (
    <div className="rounded-xl border flex items-center gap-2.5 p-2 transition-all hover:shadow-sm" style={{ borderColor: toRgba(colors.fourth, 0.12) }}>
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: "#f5f5f0" }}>
        {thumb ? <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" /> : <OutfitFlatLay top={topItem} bottom={bottomItem} size="sm" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold dark:text-dark-text/80 text-light-text/80 truncate">{outfit?.name || "Untitled"}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <AccessTime style={{ fontSize: 9, color: colors.fourth }} />
          <span className="text-[8px] font-medium" style={{ color: colors.fourth }}>{dayLabel}</span>
          <span className="text-[8px] dark:text-dark-text/30 text-light-text/30">({daysLabel})</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={onMarkWorn} className="p-1 rounded-lg hover:opacity-80" style={{ backgroundColor: toRgba(colors.fourth, 0.1) }} title="Mark as worn">
          <CheckCircle style={{ fontSize: 13, color: colors.fourth }} />
        </button>
        <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove">
          <Delete style={{ fontSize: 13 }} className="dark:text-dark-text/30 text-light-text/30" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Plan-to-Wear Modal — quick-pick dates + outfit grid
   ══════════════════════════════════════════════════════════════ */

function getQuickDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Next Saturday
  const sat = new Date(today);
  sat.setDate(sat.getDate() + (6 - sat.getDay() + 7) % 7 || 7);

  // Next Monday
  const mon = new Date(today);
  mon.setDate(mon.getDate() + (1 - mon.getDay() + 7) % 7 || 7);

  // Day after tomorrow
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  return [
    { label: "Tomorrow", date: tomorrow },
    { label: dayAfter.toLocaleDateString("en-US", { weekday: "short" }), date: dayAfter },
    { label: `Sat ${sat.getDate()}`, date: sat },
    { label: `Mon ${mon.getDate()}`, date: mon },
  ];
}

function dateToInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlanToWearModal({
  outfits, colors, planOutfitId, setPlanOutfitId, planDate, setPlanDate,
  planOccasion, setPlanOccasion, saving, onSubmit, onClose,
  resolveItem, getOutfitThumb,
}) {
  const quickDates = useMemo(() => getQuickDates(), []);
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Default to tomorrow on open
  useEffect(() => {
    if (!planDate) {
      setPlanDate(dateToInput(quickDates[0].date));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedDateStr = planDate
    ? new Date(planDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md mx-auto bg-white dark:bg-dark-primary rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b dark:border-dark-text/10 border-light-text/10">
          <div className="flex items-center gap-2">
            <EventNote style={{ fontSize: 20, color: colors.fourth }} />
            <div>
              <h3 className="text-sm font-bold dark:text-dark-text text-light-text">Plan to Wear</h3>
              {selectedDateStr && (
                <p className="text-[10px]" style={{ color: colors.fourth }}>{selectedDateStr}</p>
              )}
            </div>
          </div>
          <IconButton onClick={onClose} size="small">
            <Close style={{ fontSize: 18 }} className="dark:text-dark-text/50 text-light-text/50" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick date picker */}
          <div>
            <label className="text-[10px] font-semibold dark:text-dark-text/50 text-light-text/50 block mb-1.5">
              When?
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {quickDates.map((qd, i) => {
                const val = dateToInput(qd.date);
                const isSelected = planDate === val;
                return (
                  <button
                    key={i}
                    onClick={() => { setPlanDate(val); setShowCustomDate(false); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${isSelected ? "text-white" : "dark:text-dark-text/70 text-light-text/70 hover:opacity-80"}`}
                    style={{
                      borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.15),
                      backgroundColor: isSelected ? colors.fourth : "transparent",
                    }}
                  >
                    {qd.label}
                  </button>
                );
              })}
              <button
                onClick={() => setShowCustomDate((p) => !p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${showCustomDate ? "text-white" : "dark:text-dark-text/70 text-light-text/70 hover:opacity-80"}`}
                style={{
                  borderColor: showCustomDate ? colors.fourth : toRgba(colors.fourth, 0.15),
                  backgroundColor: showCustomDate ? colors.fourth : "transparent",
                }}
              >
                Pick date
              </button>
            </div>
            {showCustomDate && (
              <input
                type="date"
                value={planDate}
                min={dateToInput(quickDates[0].date)}
                onChange={(e) => setPlanDate(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-secondary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none transition-all"
                style={{ borderColor: toRgba(colors.fourth, 0.2) }}
              />
            )}
          </div>

          {/* Occasion quick picks */}
          <div>
            <label className="text-[10px] font-semibold dark:text-dark-text/50 text-light-text/50 block mb-1.5">
              Occasion (optional)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {["Office", "Date Night", "Party", "Casual", "Festive", "Travel"].map((occ) => {
                const isSelected = planOccasion === occ;
                return (
                  <button
                    key={occ}
                    onClick={() => setPlanOccasion(isSelected ? "" : occ)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${isSelected ? "text-white" : "dark:text-dark-text/60 text-light-text/60 hover:opacity-80"}`}
                    style={{
                      borderColor: isSelected ? colors.fourth : toRgba(colors.fourth, 0.12),
                      backgroundColor: isSelected ? colors.fourth : "transparent",
                    }}
                  >
                    {occ}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outfit selector */}
          <div>
            <label className="text-[10px] font-semibold dark:text-dark-text/50 text-light-text/50 block mb-1.5">
              Pick an outfit
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
              {outfits.map((outfit) => {
                const thumb = getOutfitThumb(outfit);
                const topItem = resolveItem(outfit, "Top");
                const bottomItem = resolveItem(outfit, "Bottom");
                const isSelected = planOutfitId === outfit._id;

                return (
                  <button
                    key={outfit._id}
                    onClick={() => setPlanOutfitId(outfit._id)}
                    className={`rounded-xl overflow-hidden transition-all border-2 ${isSelected ? "scale-[1.02] shadow-md" : "hover:shadow-sm"}`}
                    style={{ borderColor: isSelected ? colors.fourth : "transparent" }}
                  >
                    <div className="w-full aspect-square flex items-center justify-center relative" style={{ backgroundColor: "#f5f5f0" }}>
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-contain p-1" loading="lazy" />
                      ) : (
                        <OutfitFlatLay top={topItem} bottom={bottomItem} size="sm" />
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.fourth }}>
                          <CheckCircle style={{ fontSize: 13, color: "#fff" }} />
                        </div>
                      )}
                    </div>
                    <div className="px-1 py-1 dark:bg-dark-primary bg-white">
                      <p className="text-[7px] font-medium dark:text-dark-text/60 text-light-text/60 truncate text-center">
                        {outfit.name || "Untitled"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-dark-text/10 border-light-text/10">
          <button
            onClick={onSubmit}
            disabled={!planOutfitId || !planDate || saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90"
            style={{ backgroundColor: colors.fourth }}
          >
            {saving ? <CircularProgress size={14} style={{ color: "#fff" }} /> : <EventNote style={{ fontSize: 15 }} />}
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Stat Card
   ══════════════════════════════════════════════════════════════ */

function StatCard({ icon, label, value, sub, colors }) {
  return (
    <div className="rounded-xl border p-2.5 flex flex-col items-center text-center" style={{ borderColor: toRgba(colors.fourth, 0.12) }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: toRgba(colors.fourth, 0.1), color: colors.fourth }}>
        {icon}
      </div>
      <span className="text-base font-bold dark:text-dark-text/85 text-light-text/85">{value}</span>
      <span className="text-[8px] dark:text-dark-text/40 text-light-text/40">{label}</span>
      {sub && <span className="text-[7px] dark:text-dark-text/30 text-light-text/30 truncate max-w-full mt-0.5">{sub}</span>}
    </div>
  );
}

export default WearLog;
