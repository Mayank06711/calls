import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import { ADMIN_POSITION_LABELS } from "../../../constants/adminConstants";
import PageHeader from "../Common/PageHeader";
import StatusBadge from "../Common/StatusBadge";
import ConfirmDialog from "../Common/ConfirmDialog";
import { showNotification } from "../../../redux/actions";
import { MdAdminPanelSettings, MdPersonAdd, MdSearch, MdClose, MdVpnKey, MdVisibility, MdVisibilityOff, MdContentCopy, MdRefresh } from "react-icons/md";

export default function AdminTeam() {
  const dispatch = useDispatch();
  const adminInfo = useSelector((state) => state.admin.adminInfo);
  const admins = useSelector((state) => state.admin.data?.allAdmins);
  const loading = useSelector((state) => state.admin.loading?.allAdmins);

  // Upgrade form state
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [position, setPosition] = useState("agent");
  const [upgrading, setUpgrading] = useState(false);

  // User search for target user
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Created admin key display (show once after creation)
  const [createdKey, setCreatedKey] = useState(null); // { userName, key }
  const [showCreatedKey, setShowCreatedKey] = useState(false);

  // Reset key state
  const [resetTarget, setResetTarget] = useState(null); // admin._id
  const [newKey, setNewKey] = useState("");
  const [showNewKey, setShowNewKey] = useState(false);
  const [resettingKey, setResettingKey] = useState(false);

  // Deactivate state
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const isSuperAdmin = adminInfo?.position === "superadmin";

  useEffect(() => {
    dispatch(fetchAdminData("allAdmins", ENDPOINTS.ADMIN.ALL_ADMINS));
  }, [dispatch]);

  // Debounced user search
  useEffect(() => {
    if (userSearch.length < 2) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setUserSearching(true);
      const result = await adminAction("GET", ENDPOINTS.ADMIN.USERS_SEARCH, { q: userSearch });
      if (result.success) setUserResults(result.data?.users || []);
      setUserSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectUser = (user) => {
    setSelectedUser(user);
    setTargetUserId(user._id);
    setUserSearch("");
    setShowDropdown(false);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setTargetUserId("");
  };

  const handleUpgrade = async (e) => {
    e.preventDefault();
    setUpgrading(true);
    const result = await adminAction("POST", ENDPOINTS.ADMIN.UPGRADE_TO_ADMIN, {
      targetUserId: targetUserId.trim(),
      adminKey: adminKey.trim(),
      position,
    });
    dispatch(showNotification(
      result.success ? "User upgraded to admin successfully" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) {
      setCreatedKey({ userName: selectedUser?.fullName || targetUserId, key: adminKey.trim() });
      setShowCreatedKey(false);
      setShowUpgrade(false);
      setTargetUserId("");
      setAdminKey("");
      setPosition("agent");
      setSelectedUser(null);
      setUserSearch("");
      dispatch(fetchAdminData("allAdmins", ENDPOINTS.ADMIN.ALL_ADMINS));
    }
    setUpgrading(false);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    const result = await adminAction("POST", `${ENDPOINTS.ADMIN.DEACTIVATE_ADMIN}/${deactivateTarget}/deactivate`);
    dispatch(showNotification(
      result.success ? "Admin deactivated" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) dispatch(fetchAdminData("allAdmins", ENDPOINTS.ADMIN.ALL_ADMINS));
    setDeactivating(false);
    setDeactivateTarget(null);
  };

  const handleReactivate = async (adminId) => {
    const result = await adminAction("POST", `${ENDPOINTS.ADMIN.REACTIVATE_ADMIN}/${adminId}/reactivate`);
    dispatch(showNotification(
      result.success ? "Admin reactivated" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) dispatch(fetchAdminData("allAdmins", ENDPOINTS.ADMIN.ALL_ADMINS));
  };

  const handleResetKey = async (e) => {
    e.preventDefault();
    if (!resetTarget || !newKey || newKey.length < 8) return;
    setResettingKey(true);
    const result = await adminAction("POST", `${ENDPOINTS.ADMIN.RESET_ADMIN_KEY}/${resetTarget}/reset-key`, { newKey });
    dispatch(showNotification(
      result.success ? "Admin key reset successfully" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) { setResetTarget(null); setNewKey(""); setShowNewKey(false); }
    setResettingKey(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    dispatch(showNotification("Copied to clipboard", "success"));
  };

  if (loading && !admins) {
    return <div className="flex items-center justify-center py-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
  }

  const adminList = admins?.admins || admins?.data || admins || [];

  return (
    <div>
      <PageHeader
        title="Admin Team"
        subtitle={`${Array.isArray(adminList) ? adminList.length : 0} admins`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => dispatch(fetchAdminData("allAdmins", ENDPOINTS.ADMIN.ALL_ADMINS))}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setShowUpgrade(!showUpgrade)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <MdPersonAdd className="text-base" />
                Create Admin
              </button>
            )}
          </div>
        }
      />

      {/* Upgrade Form */}
      {showUpgrade && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-indigo-200 dark:border-indigo-700/50 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Upgrade User to Admin</h3>
          <form onSubmit={handleUpgrade} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={dropdownRef} className="relative">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Target User</label>
              {selectedUser ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
                  {selectedUser.profilePhoto ? (
                    <img src={typeof selectedUser.profilePhoto === "object" ? selectedUser.profilePhoto.url : selectedUser.profilePhoto} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{selectedUser.fullName?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">{selectedUser.fullName}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{selectedUser._id.slice(-6)}</span>
                  <button type="button" onClick={clearSelectedUser} className="text-gray-400 hover:text-red-500 ml-1"><MdClose size={16} /></button>
                </div>
              ) : (
                <div className="relative">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => userSearch.length >= 2 && setShowDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                          <img src={typeof user.profilePhoto === "object" ? user.profilePhoto.url : user.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">{user.fullName?.[0]?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{user.fullName}</div>
                          <div className="text-xs text-gray-400 truncate">@{user.username}{user.email ? ` · ${user.email}` : ""}</div>
                        </div>
                        {user.isAdmin && <span className="text-[10px] px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">Admin</span>}
                        {user.isExpert && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">Expert</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
              {/* Hidden required input for form validation */}
              <input type="hidden" value={targetUserId} required />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Admin Key (for the new admin)</label>
              <input
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                required
                minLength={8}
                type="password"
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="agent">Agent</option>
                <option value="operationshead">Operations Head</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={upgrading || !targetUserId}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {upgrading ? "Upgrading..." : "Upgrade to Admin"}
              </button>
              <button
                type="button"
                onClick={() => setShowUpgrade(false)}
                className="px-4 py-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Created Key Banner — shown once after creation */}
      {createdKey && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-5 shadow-sm border border-green-200 dark:border-green-700/50 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center gap-2">
                <MdVpnKey /> Admin Created — Save This Key
              </h3>
              <p className="text-xs text-green-600 dark:text-green-400 mb-3">
                This key for <strong>{createdKey.userName}</strong> will not be shown again. Copy it now.
              </p>
            </div>
            <button onClick={() => setCreatedKey(null)} className="text-green-400 hover:text-green-600"><MdClose size={18} /></button>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 border border-green-200 dark:border-green-700">
            <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200">
              {showCreatedKey ? createdKey.key : "•".repeat(createdKey.key.length)}
            </code>
            <button onClick={() => setShowCreatedKey(!showCreatedKey)} className="text-gray-400 hover:text-gray-600 p-1" title={showCreatedKey ? "Hide" : "Show"}>
              {showCreatedKey ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
            </button>
            <button onClick={() => copyToClipboard(createdKey.key)} className="text-gray-400 hover:text-indigo-600 p-1" title="Copy">
              <MdContentCopy size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Admin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(adminList) && adminList.map((admin) => (
          <div key={admin._id} className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border ${admin._id === adminInfo?._id ? "border-indigo-200 dark:border-indigo-700/50" : "border-gray-100 dark:border-gray-700"}`}>
            <div className="flex items-start gap-3">
              {admin.userId?.profilePhoto ? (
                <img src={typeof admin.userId.profilePhoto === "object" ? admin.userId.profilePhoto.url : admin.userId.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <MdAdminPanelSettings className="text-indigo-600 text-lg" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-800 dark:text-white truncate">{admin.userId?.fullName || admin.name || "Unknown"}</h3>
                  {admin._id === adminInfo?._id && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-medium">You</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{admin.userId?.email || admin.email || admin._id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={ADMIN_POSITION_LABELS[admin.position] || admin.position} />
                  {admin.isActive === false && <StatusBadge status="Inactive" />}
                </div>
                {admin.lastLoginAt && (
                  <p className="text-[10px] text-gray-400 mt-2">Last login: {new Date(admin.lastLoginAt).toLocaleString()}</p>
                )}
                {admin.permissions && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(admin.permissions)
                      .filter(([_, v]) => v)
                      .map(([perm]) => (
                        <span key={perm} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                          {perm.replace("can", "").replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
            {/* Actions for ACTIVE admins — only superadmin, can't act on self */}
            {isSuperAdmin && admin.isActive !== false && admin._id !== adminInfo?._id && (
              <div className="mt-3 space-y-2">
                {/* Reset Key inline form */}
                {resetTarget === admin._id ? (
                  <form onSubmit={handleResetKey} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        type={showNewKey ? "text" : "password"}
                        minLength={8}
                        required
                        placeholder="New key (min 8 chars)"
                        className="w-full px-3 py-1.5 pr-8 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button type="button" onClick={() => setShowNewKey(!showNewKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showNewKey ? <MdVisibilityOff size={14} /> : <MdVisibility size={14} />}
                      </button>
                    </div>
                    <button type="submit" disabled={resettingKey || newKey.length < 8} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {resettingKey ? "..." : "Save"}
                    </button>
                    <button type="button" onClick={() => { setResetTarget(null); setNewKey(""); setShowNewKey(false); }} className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setResetTarget(admin._id); setNewKey(""); setShowNewKey(false); }}
                    className="w-full py-1.5 text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <MdVpnKey size={14} /> Reset Key
                  </button>
                )}
                <button
                  onClick={() => setDeactivateTarget(admin._id)}
                  className="w-full py-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
                >
                  Remove as Admin
                </button>
              </div>
            )}
            {/* Reactivate button for INACTIVE admins */}
            {isSuperAdmin && admin.isActive === false && (
              <button
                onClick={() => handleReactivate(admin._id)}
                className="mt-3 w-full py-1.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors font-medium"
              >
                Reactivate
              </button>
            )}
          </div>
        ))}
      </div>

      {(!Array.isArray(adminList) || adminList.length === 0) && (
        <div className="text-center py-16 text-gray-400">
          <p>No admins found</p>
        </div>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Remove Admin"
        message="This will revoke all admin privileges for this user. They will no longer be able to access the admin panel. This action can be reversed by upgrading them again."
        confirmLabel="Remove"
        variant="danger"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
