import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import StatCard from "../Common/StatCard";
import StatusBadge from "../Common/StatusBadge";
import DataTable from "../Common/DataTable";
import ConfirmDialog from "../Common/ConfirmDialog";
import { showNotification } from "../../../redux/actions";
import { CircularProgress } from "@mui/material";
import { MdCheckroom, MdDevices, MdRefresh } from "react-icons/md";
import { FaUserTie } from "react-icons/fa";
import { IoMdArrowBack } from "react-icons/io";

export default function UserDetail() {
  const { userId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const detail = useSelector((state) => state.admin.data?.[`user_${userId}`]);
  const loading = useSelector((state) => state.admin.loading?.[`user_${userId}`]);
  const sessions = useSelector((state) => state.admin.data?.[`user_sessions_${userId}`]);
  const sessionsLoading = useSelector((state) => state.admin.loading?.[`user_sessions_${userId}`]);
  const [tab, setTab] = useState("profile");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminData(`user_${userId}`, `${ENDPOINTS.ADMIN.USER_DETAIL}/${userId}`));
    dispatch(fetchAdminData(`user_sessions_${userId}`, `${ENDPOINTS.ADMIN.USER_SESSIONS}/${userId}/sessions`));
  }, [dispatch, userId]);

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircularProgress size={40} />
      </div>
    );
  }

  const user = detail?.user;
  const stats = detail?.stats;

  if (!user) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">User not found</p>
        <button onClick={() => navigate("/admin/users")} className="mt-2 text-blue-500 text-sm">
          Back to Users
        </button>
      </div>
    );
  }

  const isBlocked = user?.isBlockedByAdmin;

  const handleBlockToggle = async () => {
    setBlocking(true);
    const endpoint = isBlocked
      ? `${ENDPOINTS.ADMIN.UNBLOCK_USER}/${userId}/unblock`
      : `${ENDPOINTS.ADMIN.BLOCK_USER}/${userId}/block`;
    const result = await adminAction("POST", endpoint);
    dispatch(showNotification(
      result.success ? (isBlocked ? "User unblocked" : "User blocked") : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) dispatch(fetchAdminData(`user_${userId}`, `${ENDPOINTS.ADMIN.USER_DETAIL}/${userId}`));
    setBlocking(false);
    setShowBlockConfirm(false);
  };

  const handleForceLogout = async () => {
    setLoggingOut(true);
    const result = await adminAction("POST", `${ENDPOINTS.ADMIN.USER_FORCE_LOGOUT}/${userId}/force-logout`);
    dispatch(showNotification(result.success ? `Revoked ${result.data?.revokedCount || 0} sessions` : result.message, result.success ? "success" : "error"));
    if (result.success) dispatch(fetchAdminData(`user_sessions_${userId}`, `${ENDPOINTS.ADMIN.USER_SESSIONS}/${userId}/sessions`));
    setLoggingOut(false);
    setShowLogoutConfirm(false);
  };

  const sessionColumns = [
    { key: "device", label: "Device", render: (r) => `${r.device?.browser || "?"} / ${r.device?.platform || "?"}` },
    { key: "isActive", label: "Status", render: (r) => <StatusBadge status={r.isActive ? "Active" : "Inactive"} /> },
    { key: "lastActiveAt", label: "Last Active", render: (r) => r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleString() : "—" },
    { key: "ip", label: "IP", render: (r) => r.ipAddress || "—" },
  ];

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/users")} className="text-gray-400 hover:text-gray-600">
              <IoMdArrowBack className="text-xl" />
            </button>
            <span>{user.fullName}</span>
          </div>
        }
        subtitle={`@${user.username} · ${user.email}`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                dispatch(fetchAdminData(`user_${userId}`, `${ENDPOINTS.ADMIN.USER_DETAIL}/${userId}`));
                dispatch(fetchAdminData(`user_sessions_${userId}`, `${ENDPOINTS.ADMIN.USER_SESSIONS}/${userId}/sessions`));
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowBlockConfirm(true)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                isBlocked
                  ? "bg-green-50 text-green-600 hover:bg-green-100"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100"
              }`}
            >
              {isBlocked ? "Unblock" : "Block"}
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
              Force Logout
            </button>
          </div>
        }
      />

      {/* User Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex items-start gap-4">
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xl font-bold text-gray-500">
              {user.fullName?.[0] || "?"}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{user.fullName}</h3>
              <StatusBadge status={user.isBlockedByAdmin ? "Blocked" : user.isActive ? "Active" : "Inactive"} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{user.email}</span>
              {user.phoneNumber && <span>· {user.phoneNumber}</span>}
              {user.gender && <span>· {user.gender}</span>}
              {user.city && <span>· {user.city}</span>}
            </div>
            <div className="flex gap-1 mt-2">
              {user.isAdmin && <StatusBadge status="Admin" />}
              {user.isExpert && <StatusBadge status="Expert" />}
              {user.isSubscribed && <StatusBadge status="Subscribed" />}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard title="Wardrobe Items" value={stats?.clothingItems} icon={MdCheckroom} color="indigo" />
        <StatCard title="Outfits" value={stats?.outfits} icon={MdCheckroom} color="purple" />
        <StatCard title="Active Sessions" value={stats?.activeSessions} icon={MdDevices} color="blue" />
        <StatCard title="Bug Reports" value={stats?.bugReports} color="orange" />
        <StatCard title="Expert Reviews" value={stats?.expertReviews} icon={FaUserTie} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
        {["profile", "sessions", "subscription"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-sm capitalize transition-colors ${
              tab === t ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["User ID", user._id],
              ["Joined", new Date(user.createdAt).toLocaleString()],
              ["Email Verified", user.isEmailVerified ? "Yes" : "No"],
              ["Phone", user.phoneNumber || "—"],
              ["Gender", user.gender || "—"],
              ["City", user.city || "—"],
              ["Date of Birth", user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-gray-700 dark:text-gray-300 break-all">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "sessions" && (
        <DataTable
          columns={sessionColumns}
          data={sessions?.sessions || []}
          loading={sessionsLoading}
          page={sessions?.page}
          pages={sessions?.pages}
          total={sessions?.total}
          emptyMessage="No sessions found"
        />
      )}

      {tab === "subscription" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          {detail?.subscription ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Type", detail.subscription.type],
                ["Status", detail.subscription.status],
                ["Start", new Date(detail.subscription.startDate).toLocaleDateString()],
                ["End", new Date(detail.subscription.endDate).toLocaleDateString()],
                ["Amount", `₹${detail.subscription.amount}`],
                ["Payment", detail.subscription.paymentStatus],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-gray-700 dark:text-gray-300">{val}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No active subscription</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Force Logout"
        message={`This will revoke all active sessions for ${user.fullName} and force them to log in again.`}
        confirmLabel="Force Logout"
        variant="danger"
        loading={loggingOut}
        onConfirm={handleForceLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        open={showBlockConfirm}
        title={isBlocked ? "Unblock User" : "Block User"}
        message={isBlocked
          ? `This will unblock ${user.fullName} and restore their access to the platform.`
          : `This will block ${user.fullName} from accessing the platform. They will be unable to log in or use any features.`
        }
        confirmLabel={isBlocked ? "Unblock" : "Block"}
        variant={isBlocked ? "warning" : "danger"}
        loading={blocking}
        onConfirm={handleBlockToggle}
        onCancel={() => setShowBlockConfirm(false)}
      />
    </div>
  );
}
