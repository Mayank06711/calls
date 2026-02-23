import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import ConfirmDialog from "../Common/ConfirmDialog";
import { showNotification } from "../../../redux/actions";
import { MdDevices, MdComputer, MdPhoneAndroid, MdRefresh } from "react-icons/md";

export default function SessionList() {
  const dispatch = useDispatch();
  const sessions = useSelector((state) => state.admin.data?.adminSessions);
  const loading = useSelector((state) => state.admin.loading?.adminSessions);
  const stats = useSelector((state) => state.admin.data?.sessionStats);
  const [page, setPage] = useState(1);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminData("sessionStats", ENDPOINTS.ADMIN.SESSIONS_STATS));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAdminData("adminSessions", ENDPOINTS.ADMIN.SESSIONS, { page, limit: 20 }));
  }, [dispatch, page]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const result = await adminAction("POST", `${ENDPOINTS.ADMIN.SESSION_REVOKE}/${revokeTarget}/revoke`);
    dispatch(showNotification(result.success ? "Session revoked" : result.message, result.success ? "success" : "error"));
    if (result.success) dispatch(fetchAdminData("adminSessions", ENDPOINTS.ADMIN.SESSIONS, { page, limit: 20 }));
    setRevoking(false);
    setRevokeTarget(null);
  };

  const columns = [
    {
      key: "user", label: "User",
      render: (r) => (
        <div>
          <p className="font-medium text-sm">{r.userId?.fullName || "Unknown"}</p>
          <p className="text-xs text-gray-400">{r.userId?.email || ""}</p>
        </div>
      ),
    },
    { key: "device", label: "Device", render: (r) => `${r.device?.browser || "?"} / ${r.device?.platform || "?"}` },
    { key: "deviceType", label: "Type", render: (r) => r.device?.type || "?" },
    { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} /> },
    { key: "lastActiveAt", label: "Last Active", render: (r) => r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString() : "—" },
    { key: "ip", label: "IP", render: (r) => r.ipAddress || "—" },
    {
      key: "actions", label: "",
      render: (r) => r.isActive ? (
        <button onClick={(e) => { e.stopPropagation(); setRevokeTarget(r._id); }} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">
          Revoke
        </button>
      ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Session Management"
        subtitle="Active sessions across the platform"
        actions={
          <button
            onClick={() => {
              dispatch(fetchAdminData("sessionStats", ENDPOINTS.ADMIN.SESSIONS_STATS));
              dispatch(fetchAdminData("adminSessions", ENDPOINTS.ADMIN.SESSIONS, { page, limit: 20 }));
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Active" value={stats?.totalActive || 0} icon={MdDevices} color="blue" />
        {(stats?.byDeviceType || []).slice(0, 3).map((d, i) => (
          <StatCard key={i} title={d.type || "Unknown"} value={d.count} icon={d.type === "mobile" ? MdPhoneAndroid : MdComputer} color={["green", "purple", "orange"][i]} />
        ))}
      </div>

      <DataTable columns={columns} data={sessions?.sessions || []} loading={loading} page={sessions?.page} pages={sessions?.pages} total={sessions?.total} onPageChange={setPage} emptyMessage="No active sessions" />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke Session"
        message="This will immediately terminate the user's session and force them to log in again."
        confirmLabel="Revoke"
        variant="danger"
        loading={revoking}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
