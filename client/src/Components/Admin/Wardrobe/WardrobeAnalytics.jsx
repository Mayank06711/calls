import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import StatCard from "../Common/StatCard";
import { MdCheckroom, MdAutoAwesome, MdTrendingUp, MdPalette, MdRefresh } from "react-icons/md";
import { CircularProgress } from "@mui/material";

function TopList({ title, items = [], labelKey, countKey = "count" }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i[countKey] || 0), 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 10).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-5 text-right">{i + 1}.</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-700 dark:text-gray-300 truncate">{item[labelKey]}</span>
                <span className="text-gray-500">{item[countKey]}</span>
              </div>
              <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(item[countKey] / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WardrobeAnalytics() {
  const dispatch = useDispatch();
  const stats = useSelector((state) => state.admin.data?.wardrobeStats);
  const trends = useSelector((state) => state.admin.data?.wardrobeTrends);
  const aiUsage = useSelector((state) => state.admin.data?.wardrobeAIUsage);
  const loading = useSelector((state) => state.admin.loading?.wardrobeStats);

  useEffect(() => {
    dispatch(fetchAdminData("wardrobeStats", ENDPOINTS.ADMIN.WARDROBE_STATS));
    dispatch(fetchAdminData("wardrobeTrends", ENDPOINTS.ADMIN.WARDROBE_TRENDS));
    dispatch(fetchAdminData("wardrobeAIUsage", ENDPOINTS.ADMIN.WARDROBE_AI_USAGE));
  }, [dispatch]);

  if (loading && !stats) {
    return <div className="flex items-center justify-center py-32"><CircularProgress size={40} /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Wardrobe Analytics"
        subtitle="Platform-wide wardrobe and AI usage stats"
        actions={
          <button
            onClick={() => {
              dispatch(fetchAdminData("wardrobeStats", ENDPOINTS.ADMIN.WARDROBE_STATS));
              dispatch(fetchAdminData("wardrobeTrends", ENDPOINTS.ADMIN.WARDROBE_TRENDS));
              dispatch(fetchAdminData("wardrobeAIUsage", ENDPOINTS.ADMIN.WARDROBE_AI_USAGE));
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Items" value={stats?.totalItems?.toLocaleString() || 0} icon={MdCheckroom} color="indigo" />
        <StatCard title="Total Outfits" value={stats?.totalOutfits?.toLocaleString() || 0} icon={MdCheckroom} color="purple" />
        <StatCard title="Users with Items" value={stats?.usersWithItems || 0} icon={MdTrendingUp} color="blue" />
        <StatCard title="Avg Items/User" value={stats?.avgItemsPerUser || 0} icon={MdCheckroom} color="green" />
      </div>

      {/* AI Usage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Style DNA Analyses" value={aiUsage?.styleDnaAnalyses || 0} icon={MdAutoAwesome} color="purple" />
        <StatCard title="AI Processed Items" value={aiUsage?.processedItems || 0} icon={MdAutoAwesome} color="teal" />
        <StatCard title="Flatlay Generations" value={aiUsage?.flatlayGenerations || 0} icon={MdAutoAwesome} color="orange" />
        <StatCard title="Outfit Sources" value={aiUsage?.outfitsBySource?.length || 0} icon={MdAutoAwesome} color="blue" />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <TopList title="Top Colors" items={trends?.topColors || []} labelKey="color" />
        <TopList title="Top Brands" items={trends?.topBrands || []} labelKey="brand" />
        <TopList title="Top Subcategories" items={trends?.topSubcategories || []} labelKey="subcategory" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TopList title="By Season" items={trends?.bySeason || []} labelKey="season" />
        <TopList title="By Occasion" items={trends?.byOccasion || []} labelKey="occasion" />
      </div>
    </div>
  );
}
