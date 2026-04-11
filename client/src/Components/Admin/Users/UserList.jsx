import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import { showNotification } from "../../../redux/actions";
import { MdRefresh } from "react-icons/md";

export default function UserList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const users = useSelector((state) => state.admin.data?.users);
  const loading = useSelector((state) => state.admin.loading?.users);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const loadUsers = useCallback(() => {
    dispatch(fetchAdminData("users", ENDPOINTS.ADMIN.USERS, { page, limit: 20, search, ...filters }));
  }, [dispatch, page, search, filters]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const columns = [
    {
      key: "fullName", label: "User",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.profilePhoto ? (
            <img src={row.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-500">
              {row.fullName?.[0] || "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{row.fullName}</p>
            <p className="text-xs text-gray-400">@{row.username}</p>
          </div>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    {
      key: "isActive", label: "Status",
      render: (row) => <StatusBadge status={row.isBlockedByAdmin ? "Blocked" : row.isActive ? "Active" : "Inactive"} />,
    },
    {
      key: "roles", label: "Roles",
      render: (row) => (
        <div className="flex gap-1">
          {row.isAdmin && <StatusBadge status="Admin" />}
          {row.isExpert && <StatusBadge status="Expert" />}
          {row.isSubscribed && <StatusBadge status="Subscribed" />}
        </div>
      ),
    },
    {
      key: "createdAt", label: "Joined",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={users ? `${users.total} total users` : "Loading..."}
        actions={
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, username..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          onChange={(e) => { setFilters(f => ({ ...f, isActive: e.target.value || undefined })); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          onChange={(e) => { setFilters(f => ({ ...f, isExpert: e.target.value || undefined })); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Types</option>
          <option value="true">Experts Only</option>
          <option value="false">Non-Experts</option>
        </select>
        <select
          onChange={(e) => { setFilters(f => ({ ...f, isSubscribed: e.target.value || undefined })); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="">All Plans</option>
          <option value="true">Subscribed</option>
          <option value="false">Free</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={users?.users || []}
        loading={loading}
        page={users?.page}
        pages={users?.pages}
        total={users?.total}
        onPageChange={setPage}
        onRowClick={(row) => navigate(`/admin/users/${row._id}`)}
        emptyMessage="No users found"
      />
    </div>
  );
}
