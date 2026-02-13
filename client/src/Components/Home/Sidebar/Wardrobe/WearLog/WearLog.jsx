import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import {
  fetchWearHistoryThunk,
  fetchWearStatsThunk,
  logWearThunk,
  fetchOutfitsThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import PremiumGate from "../shared/PremiumGate";
import CalendarGrid from "./CalendarGrid";
import { CustomSelect } from "../shared/OccasionSeasonPicker";

function WearLog() {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, logging, history, stats } = useSelector((s) => s.wardrobe.wearLog);
  const { saved: outfits } = useSelector((s) => s.wardrobe.outfits);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedOutfitId, setSelectedOutfitId] = useState("");

  useEffect(() => {
    dispatch(fetchWearHistoryThunk({ month: month + 1, year }));
    dispatch(fetchWearStatsThunk());
    if (outfits.length === 0) dispatch(fetchOutfitsThunk());
  }, [dispatch, month, year, outfits.length]);

  const handlePrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const handleNextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleQuickLog = async () => {
    if (!selectedOutfitId) return;
    await dispatch(logWearThunk({ outfitId: selectedOutfitId, wornAt: new Date().toISOString() }));
    dispatch(fetchWearHistoryThunk({ month: month + 1, year }));
    dispatch(fetchWearStatsThunk());
  };

  const handleDayClick = (day, entries) => {
    if (entries.length > 0 && entries[0].outfitId) {
      navigate(`/wardrobe/outfits/${entries[0].outfitId}`);
    }
  };

  // Build options for the custom select
  const outfitOptions = outfits.map((o) => ({
    value: o._id,
    label: o.name || "Untitled",
  }));

  return (
    <PremiumGate requiredTier="Silver" message="Outfit Log requires Silver or above">
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
          <div className="flex items-center gap-2">
            <IconButton onClick={() => navigate("/wardrobe")} size="small">
              <ArrowBack style={{ color: colors.fourth }} />
            </IconButton>
            <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">
              Outfit Log
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4">
        {/* Quick log */}
        <div
          className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
          style={{ borderColor: toRgba(colors.fourth, 0.3) }}
        >
          <p className="text-xs font-medium dark:text-dark-text/60 text-light-text/60 mb-2">Quick Log</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <CustomSelect
                value={selectedOutfitId}
                onChange={setSelectedOutfitId}
                options={outfitOptions}
                placeholder="Select outfit"
                colors={colors}
              />
            </div>
            <button
              onClick={handleQuickLog}
              disabled={!selectedOutfitId || logging}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 flex items-center gap-1.5 flex-shrink-0"
              style={{ backgroundColor: colors.fourth }}
            >
              {logging && <CircularProgress size={12} style={{ color: "white" }} />}
              I wore this today
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div
          className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4 mb-4"
          style={{ borderColor: toRgba(colors.fourth, 0.3) }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <CircularProgress size={24} style={{ color: colors.fourth }} />
            </div>
          ) : (
            <CalendarGrid
              year={year}
              month={month}
              wearHistory={history}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onDayClick={handleDayClick}
            />
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div
            className="rounded-xl backdrop-blur-md dark:bg-dark-primary bg-light-secondary border p-4"
            style={{ borderColor: toRgba(colors.fourth, 0.3) }}
          >
            <h4 className="text-sm font-semibold mb-3 dark:text-dark-text/80 text-light-text/80">
              Stats
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="This Month" value={stats.monthlyCount ?? stats.thisMonth ?? 0} colors={colors} />
              <StatBox label="Total Logged" value={stats.totalCount ?? stats.total ?? 0} colors={colors} />
              {stats.mostWorn && (
                <div className="col-span-2">
                  <span className="text-[10px] dark:text-dark-text/40 text-light-text/40 block mb-1">Most Worn</span>
                  <span className="text-xs dark:text-dark-text/80 text-light-text/80">
                    {stats.mostWorn.name || stats.mostWorn.outfitName || "—"} ({stats.mostWorn.count || 0}x)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </PremiumGate>
  );
}

function StatBox({ label, value, colors }) {
  return (
    <div className="text-center">
      <span className="text-xl font-bold" style={{ color: colors.fourth }}>{value}</span>
      <span className="text-[10px] dark:text-dark-text/40 text-light-text/40 block">{label}</span>
    </div>
  );
}

export default WearLog;
