import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardOverview, fetchAdminData } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import StatCard from "../Common/StatCard";
import { MdPeople, MdSubscriptions, MdReportProblem, MdDevices, MdCheckroom, MdTrendingUp, MdRefresh } from "react-icons/md";
import { FaUserTie, FaDollarSign } from "react-icons/fa";
import { CircularProgress } from "@mui/material";

function MiniChart({ data = [], label, color = "#3b82f6" }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count || d.value || 0), 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{label}</p>
      <div className="flex items-end gap-1 h-24">
        {data.slice(-20).map((d, i) => {
          const val = d.count || d.value || 0;
          const h = Math.max((val / max) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div
                className="w-full rounded-t transition-all"
                style={{ height: `${h}%`, backgroundColor: color, opacity: 0.8 }}
              />
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                {d.label || d.date || ""}: {val}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({ title, items = [], labelKey, countKey = "count" }) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i[countKey] || 0), 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 8).map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-5 text-right">{i + 1}.</span>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-gray-700 dark:text-gray-300 truncate">{item[labelKey]}</span>
                <span className="text-gray-500">{item[countKey]}</span>
              </div>
              <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(item[countKey] / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ activities = [] }) {
  if (!activities.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Activity</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
            <div>
              <span className="text-gray-700 dark:text-gray-300">{a.text || a.fullName || a.type}</span>
              <span className="text-gray-400 ml-1">
                {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { dashboard, isDashboardLoading } = useSelector((state) => state.admin);
  const userGrowth = useSelector((state) => state.admin.data?.userGrowth);
  const expertStats = useSelector((state) => state.admin.data?.expertStats);
  const recentActivity = useSelector((state) => state.admin.data?.recentActivity);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    dispatch(fetchDashboardOverview());
    dispatch(fetchAdminData("expertStats", ENDPOINTS.ADMIN.DASHBOARD_EXPERT_STATS));
    dispatch(fetchAdminData("recentActivity", ENDPOINTS.ADMIN.DASHBOARD_RECENT_ACTIVITY));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAdminData("userGrowth", ENDPOINTS.ADMIN.DASHBOARD_USER_GROWTH, { period }));
  }, [dispatch, period]);

  if (isDashboardLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircularProgress size={40} />
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Platform overview and key metrics"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={() => {
                dispatch(fetchDashboardOverview());
                dispatch(fetchAdminData("expertStats", ENDPOINTS.ADMIN.DASHBOARD_EXPERT_STATS));
                dispatch(fetchAdminData("recentActivity", ENDPOINTS.ADMIN.DASHBOARD_RECENT_ACTIVITY));
                dispatch(fetchAdminData("userGrowth", ENDPOINTS.ADMIN.DASHBOARD_USER_GROWTH, { period }));
              }}
              disabled={isDashboardLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <MdRefresh className={`text-lg ${isDashboardLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Users" value={d.totalUsers?.toLocaleString()} icon={MdPeople} color="blue" subtitle={d.newUsersToday ? `+${d.newUsersToday} today` : undefined} />
        <StatCard title="Active Experts" value={d.totalExperts?.toLocaleString()} icon={FaUserTie} color="purple" />
        <StatCard title="Active Subscriptions" value={d.activeSubscriptions?.toLocaleString()} icon={MdSubscriptions} color="green" />
        <StatCard title="Total Revenue" value={d.totalRevenue ? `₹${d.totalRevenue.toLocaleString()}` : "₹0"} icon={FaDollarSign} color="orange" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Pending Applications" value={d.pendingApplications} icon={FaUserTie} color="teal" />
        <StatCard title="Open Complaints" value={d.openComplaints} icon={MdReportProblem} color="red" />
        <StatCard title="Wardrobe Items" value={d.totalClothingItems?.toLocaleString()} icon={MdCheckroom} color="indigo" />
        <StatCard title="Outfits Created" value={d.totalOutfits?.toLocaleString()} icon={MdTrendingUp} color="pink" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <MiniChart
          data={userGrowth?.data?.map((d) => ({ count: d.count, label: d.date })) || []}
          label={`User Growth (${period})`}
          color="#3b82f6"
        />
        <TopList
          title="Expert Application Pipeline"
          items={expertStats?.byStatus?.map((s) => ({ status: s.status, count: s.count })) || []}
          labelKey="status"
        />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RecentActivity
          activities={[
            ...(recentActivity?.latestUsers?.map((u) => ({ text: `${u.fullName} joined`, createdAt: u.createdAt })) || []),
            ...(recentActivity?.latestComplaints?.map((c) => ({ text: `Complaint: ${c.category || "General"}`, createdAt: c.createdAt })) || []),
          ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)}
        />
        <TopList
          title="Subscriptions by Type"
          items={d.subscriptionsByType || []}
          labelKey="type"
        />
      </div>
    </div>
  );
}
