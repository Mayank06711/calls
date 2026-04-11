import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import { showNotification } from "../../../redux/actions";
import { MdSubscriptions, MdTrendingUp, MdRefresh } from "react-icons/md";
import { FaDollarSign } from "react-icons/fa";

export default function SubscriptionList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const subs = useSelector((state) => state.admin.data?.subscriptions);
  const loading = useSelector((state) => state.admin.loading?.subscriptions);
  const stats = useSelector((state) => state.admin.data?.subscriptionStats);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [extendModal, setExtendModal] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState("");

  useEffect(() => {
    dispatch(fetchAdminData("subscriptionStats", ENDPOINTS.ADMIN.SUBSCRIPTIONS_STATS));
  }, [dispatch]);

  const loadSubs = useCallback(() => {
    dispatch(fetchAdminData("subscriptions", ENDPOINTS.ADMIN.SUBSCRIPTIONS, { page, limit: 20, ...filters }));
  }, [dispatch, page, filters]);

  useEffect(() => { loadSubs(); }, [loadSubs]);

  const handleExtend = async () => {
    if (!extendModal || !extendReason) return;
    const result = await adminAction("PATCH", `${ENDPOINTS.ADMIN.SUBSCRIPTION_EXTEND}/${extendModal}/extend`, {
      days: extendDays,
      reason: extendReason,
    });
    dispatch(showNotification(result.success ? "Subscription extended" : result.message, result.success ? "success" : "error"));
    if (result.success) { setExtendModal(null); setExtendReason(""); loadSubs(); }
  };

  const columns = [
    {
      key: "user", label: "User",
      render: (r) => (
        <div>
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{r.userId?.fullName || "Unknown"}</p>
          <p className="text-xs text-gray-400">{r.userId?.email || ""}</p>
        </div>
      ),
    },
    { key: "type", label: "Plan", render: (r) => <span className="font-medium capitalize">{r.type || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "paymentStatus", label: "Payment", render: (r) => <StatusBadge status={r.paymentStatus || "—"} /> },
    { key: "amount", label: "Amount", render: (r) => r.amount ? `₹${r.amount}` : "—" },
    {
      key: "period", label: "Period",
      render: (r) => `${r.startDate ? new Date(r.startDate).toLocaleDateString() : "?"} - ${r.endDate ? new Date(r.endDate).toLocaleDateString() : "?"}`,
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setExtendModal(r._id); }}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
        >
          Extend
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        subtitle={stats ? `₹${(stats.totalRevenue || 0).toLocaleString()} total revenue` : "Loading..."}
        actions={
          <button
            onClick={() => { loadSubs(); dispatch(fetchAdminData("subscriptionStats", ENDPOINTS.ADMIN.SUBSCRIPTIONS_STATS)); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue" value={stats?.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : "—"} icon={FaDollarSign} color="green" />
        <StatCard title="Active Subscriptions" value={stats?.byStatus?.find(s => s.status === "Active")?.count || 0} icon={MdSubscriptions} color="blue" />
        <StatCard title="Expired" value={stats?.byStatus?.find(s => s.status === "Expired")?.count || 0} icon={MdSubscriptions} color="orange" />
        <StatCard title="Monthly Revenue" value={stats?.monthlyRevenue?.[0]?.revenue ? `₹${stats.monthlyRevenue[0].revenue.toLocaleString()}` : "—"} icon={MdTrendingUp} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value || undefined })); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Plans</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
          <option value="platinum">Platinum</option>
        </select>
        <select
          onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value || undefined })); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={subs?.subscriptions || []}
        loading={loading}
        page={subs?.page}
        pages={subs?.pages}
        total={subs?.total}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/subscriptions/${row._id}`)}
        emptyMessage="No subscriptions found"
      />

      {/* Extend Modal */}
      {extendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Extend Subscription</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Days to extend</label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  min={1}
                  max={365}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300">Reason</label>
                <input
                  type="text"
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="Reason for extension"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setExtendModal(null)} className="flex-1 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={!extendReason}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Extend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
