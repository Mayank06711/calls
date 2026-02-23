import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAdminData } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import { MdReportProblem, MdRefresh } from "react-icons/md";

export default function ComplaintList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const stats = useSelector((state) => state.admin.data?.complaintStats);
  const complaints = useSelector((state) => state.admin.data?.complaints);
  const complaintsLoading = useSelector((state) => state.admin.loading?.complaints);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    dispatch(fetchAdminData("complaintStats", ENDPOINTS.ADMIN.COMPLAINTS_STATS));
  }, [dispatch]);

  useEffect(() => {
    const params = { page, limit: 20 };
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    dispatch(fetchAdminData("complaints", ENDPOINTS.ADMIN.COMPLAINTS, params));
  }, [dispatch, page, statusFilter, categoryFilter]);

  const byStatus = stats?.byStatus || [];
  const byCategory = stats?.byCategory || [];

  const statusOptions = ["new", "reviewing", "resolved", "dismissed"];
  const categoryOptions = ["harassment", "fraud", "inappropriate", "spam", "other"];

  const columns = [
    {
      key: "complainant", label: "Complainant",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.complainant?.profilePhoto ? (
            <img src={r.complainant.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
              {r.complainant?.fullName?.[0] || "?"}
            </div>
          )}
          <span className="text-sm">{r.complainant?.fullName || "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "expert", label: "Expert",
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.expert?.profilePhoto ? (
            <img src={r.expert.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
              {r.expert?.fullName?.[0] || "?"}
            </div>
          )}
          <span className="text-sm">{r.expert?.fullName || "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "category", label: "Category",
      render: (r) => (
        <span className="px-2 py-0.5 text-xs rounded-full font-medium capitalize bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {r.category || "other"}
        </span>
      ),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status || "new"} /> },
    {
      key: "reason", label: "Reason",
      render: (r) => <span className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{r.reason || "—"}</span>,
    },
    {
      key: "createdAt", label: "Date",
      render: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Complaint Management"
        subtitle="Expert complaints and resolution tracking"
        actions={
          <button
            onClick={() => {
              dispatch(fetchAdminData("complaintStats", ENDPOINTS.ADMIN.COMPLAINTS_STATS));
              const params = { page, limit: 20 };
              if (statusFilter) params.status = statusFilter;
              if (categoryFilter) params.category = categoryFilter;
              dispatch(fetchAdminData("complaints", ENDPOINTS.ADMIN.COMPLAINTS, params));
            }}
            disabled={complaintsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${complaintsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Complaints" value={stats?.total || 0} icon={MdReportProblem} color="red" />
        {byStatus.slice(0, 3).map((s, i) => (
          <StatCard key={i} title={s.status || "Unknown"} value={s.count} color={s.status === "resolved" ? "green" : s.status === "new" ? "orange" : "blue"} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Complaint Table */}
      <DataTable
        columns={columns}
        data={complaints?.complaints || []}
        loading={complaintsLoading}
        page={page}
        pages={complaints?.pages}
        total={complaints?.total}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/complaints/${row._id}`)}
        emptyMessage="No complaints found"
      />

      {/* Stats Breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Category</h3>
          <div className="space-y-2">
            {byCategory.map((c, i) => {
              const max = Math.max(...byCategory.map(x => x.count), 1);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate capitalize">{c.category || "Other"}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(c.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
