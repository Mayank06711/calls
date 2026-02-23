import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import { showNotification } from "../../../redux/actions";
import { MdNotifications, MdSend, MdClose, MdSearch, MdRefresh } from "react-icons/md";

export default function NotificationList() {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.admin.data?.notifications);
  const loading = useSelector((state) => state.admin.loading?.notifications);
  const stats = useSelector((state) => state.admin.data?.notifStats);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("history");

  // Send form
  const [sendType, setSendType] = useState("system");
  const [sendSeverity, setSendSeverity] = useState("info");
  const [sendMessage, setSendMessage] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");
  const [sending, setSending] = useState(false);

  // User search for recipient
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    dispatch(fetchAdminData("notifStats", ENDPOINTS.ADMIN.NOTIFICATIONS_STATS));
  }, [dispatch]);

  useEffect(() => {
    if (tab === "history") {
      dispatch(fetchAdminData("notifications", ENDPOINTS.ADMIN.NOTIFICATIONS, { page, limit: 20 }));
    }
  }, [dispatch, tab, page]);

  // Debounced user search
  useEffect(() => {
    if (userSearch.length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearching(true);
      const result = await adminAction("GET", ENDPOINTS.ADMIN.USERS_SEARCH, { q: userSearch });
      if (result.success) {
        setUserResults(result.data?.users || []);
      }
      setUserSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectUser = (user) => {
    setSelectedUser(user);
    setSendRecipient(user._id);
    setUserSearch("");
    setShowDropdown(false);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setSendRecipient("");
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    const endpoint = sendRecipient ? ENDPOINTS.ADMIN.SEND_USER_NOTIFICATION : ENDPOINTS.ADMIN.SEND_NOTIFICATION;
    const payload = { type: sendType, severity: sendSeverity, message: sendMessage, title: sendMessage.slice(0, 60) };
    if (sendRecipient) payload.recipientId = sendRecipient;

    const result = await adminAction("POST", endpoint, payload);
    dispatch(showNotification(result.success ? "Notification sent" : result.message, result.success ? "success" : "error"));
    if (result.success) { setSendMessage(""); setSendRecipient(""); setSelectedUser(null); setUserSearch(""); }
    setSending(false);
  };

  const columns = [
    { key: "type", label: "Type", render: (r) => <StatusBadge status={r.type} /> },
    { key: "message", label: "Message", render: (r) => <span className="line-clamp-2 text-xs">{r.message || "—"}</span> },
    { key: "recipient", label: "Recipient", render: (r) => r.recipientId?.fullName || "Broadcast" },
    { key: "read", label: "Read", render: (r) => r.read ? "Yes" : "No" },
    { key: "createdAt", label: "Sent", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Send and track notifications"
        actions={
          <button
            onClick={() => {
              dispatch(fetchAdminData("notifStats", ENDPOINTS.ADMIN.NOTIFICATIONS_STATS));
              if (tab === "history") dispatch(fetchAdminData("notifications", ENDPOINTS.ADMIN.NOTIFICATIONS, { page, limit: 20 }));
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Sent" value={stats?.total || 0} icon={MdNotifications} color="blue" />
        <StatCard title="Read Rate" value={stats?.readRate ? `${stats.readRate}%` : "—"} icon={MdNotifications} color="green" />
        <StatCard title="Types" value={stats?.byType?.length || 0} icon={MdSend} color="purple" />
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
        {[{ key: "history", label: "History" }, { key: "send", label: "Send Notification" }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm transition-colors ${tab === t.key ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <DataTable columns={columns} data={notifications?.notifications || []} loading={loading} page={notifications?.page} pages={notifications?.pages} total={notifications?.total} onPageChange={setPage} emptyMessage="No notifications sent yet" />
      )}

      {tab === "send" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 max-w-lg">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">Type</label>
                <select value={sendType} onChange={(e) => setSendType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="system">System</option>
                  <option value="promotion">Promotion</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="social">Social</option>
                  <option value="wardrobe">Wardrobe</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">Severity</label>
                <select value={sendSeverity} onChange={(e) => setSendSeverity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">Message</label>
              <textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} rows={3} required className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" placeholder="Notification message..." />
            </div>
            <div ref={dropdownRef} className="relative">
              <label className="text-sm text-gray-600 dark:text-gray-300 block mb-1">Recipient (leave empty for broadcast)</label>
              {selectedUser ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                  {selectedUser.profilePhoto && <img src={selectedUser.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover" />}
                  <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">{selectedUser.fullName}</span>
                  <span className="text-xs text-gray-400 font-mono">{selectedUser._id.slice(-6)}</span>
                  <button type="button" onClick={clearSelectedUser} className="text-gray-400 hover:text-red-500 ml-1"><MdClose size={16} /></button>
                </div>
              ) : (
                <div className="relative">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => userSearch.length >= 2 && setShowDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    placeholder="Search by name, username, or email..."
                  />
                </div>
              )}
              {showDropdown && userSearch.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 max-h-48 overflow-y-auto">
                  {userSearching ? (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">Searching...</div>
                  ) : userResults.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">No users found</div>
                  ) : (
                    userResults.map((user) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => selectUser(user)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        {user.profilePhoto ? (
                          <img src={user.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-300">{user.fullName?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{user.fullName}</div>
                          <div className="text-xs text-gray-400 truncate">@{user.username}{user.email ? ` · ${user.email}` : ""}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button type="submit" disabled={sending || !sendMessage} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {sending ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
