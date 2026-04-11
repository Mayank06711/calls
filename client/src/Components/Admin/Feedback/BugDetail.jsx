import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import StatusBadge from "../Common/StatusBadge";
import { showNotification } from "../../../redux/actions";
import { CircularProgress } from "@mui/material";
import { IoMdArrowBack } from "react-icons/io";
import { MdPerson, MdSend, MdBugReport, MdRefresh } from "react-icons/md";

export default function BugDetail() {
  const { bugId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const bug = useSelector((state) => state.admin.data?.[`bug_${bugId}`]);
  const loading = useSelector((state) => state.admin.loading?.[`bug_${bugId}`]);

  // Notification form state
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifSeverity, setNotifSeverity] = useState("info");
  const [notifMessage, setNotifMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminData(`bug_${bugId}`, `${ENDPOINTS.ADMIN.BUG_REPORTS}/${bugId}`));
  }, [dispatch, bugId]);

  const handleRefresh = () => {
    dispatch(fetchAdminData(`bug_${bugId}`, `${ENDPOINTS.ADMIN.BUG_REPORTS}/${bugId}`));
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!bug?.user?._id) return;
    setSending(true);
    const result = await adminAction("POST", ENDPOINTS.ADMIN.SEND_USER_NOTIFICATION, {
      type: "system",
      severity: notifSeverity,
      title: `Regarding your bug report #${bugId.slice(-8)}`,
      message: notifMessage,
      recipientId: bug.user._id,
    });
    dispatch(showNotification(
      result.success ? "Notification sent to user" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) {
      setNotifMessage("");
      setShowNotifForm(false);
    }
    setSending(false);
  };

  const severityColor = (s) => {
    switch (s) {
      case "Critical": return "bg-red-100 text-red-700 border-red-200";
      case "High": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  if (loading && !bug) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircularProgress size={40} />
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MdBugReport className="text-5xl mx-auto mb-3 opacity-50" />
        <p className="text-lg">Bug report not found</p>
        <button onClick={() => navigate("/admin/feedback")} className="mt-2 text-blue-500 text-sm">
          Back to Feedback
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/feedback")} className="text-gray-400 hover:text-gray-600">
              <IoMdArrowBack className="text-xl" />
            </button>
            <span>Bug Report</span>
          </div>
        }
        subtitle={`#${bug._id?.slice(-8)} · ${new Date(bug.createdAt).toLocaleString()}`}
        actions={
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bug Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <StatusBadge status={bug.bugType || "Other"} />
              <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium border ${severityColor(bug.severity)}`}>
                {bug.severity || "Medium"}
              </span>
              <StatusBadge status={bug.status || "New"} />
            </div>

            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Message</h3>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap mb-4">
              {bug.message}
            </p>

            {bug.stepsToReproduce && (
              <>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Steps to Reproduce</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-4">
                  {bug.stepsToReproduce}
                </p>
              </>
            )}

            {bug.customBugType && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Custom Bug Type</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{bug.customBugType}</p>
              </div>
            )}

            {bug.response && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Admin Response</h3>
                <p className="text-blue-800 dark:text-blue-200 text-sm">{bug.response}</p>
                {bug.reviewDate && (
                  <p className="text-xs text-blue-500 mt-1">Reviewed: {new Date(bug.reviewDate).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>

          {/* System Info */}
          {(bug.browserInfo || bug.osInfo || bug.screenResolution || bug.appVersion) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {bug.browserInfo && (
                  <div>
                    <p className="text-gray-400 text-xs">Browser</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.browserInfo}</p>
                  </div>
                )}
                {bug.osInfo && (
                  <div>
                    <p className="text-gray-400 text-xs">OS</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.osInfo}</p>
                  </div>
                )}
                {bug.screenResolution && (
                  <div>
                    <p className="text-gray-400 text-xs">Screen Resolution</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.screenResolution}</p>
                  </div>
                )}
                {bug.appVersion && (
                  <div>
                    <p className="text-gray-400 text-xs">App Version</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.appVersion}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {bug.location && (bug.location.city || bug.location.country) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Location</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {bug.location.city && (
                  <div>
                    <p className="text-gray-400 text-xs">City</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.location.city}</p>
                  </div>
                )}
                {bug.location.region && (
                  <div>
                    <p className="text-gray-400 text-xs">Region</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.location.region}</p>
                  </div>
                )}
                {bug.location.country && (
                  <div>
                    <p className="text-gray-400 text-xs">Country</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.location.country}</p>
                  </div>
                )}
                {bug.location.ip && (
                  <div>
                    <p className="text-gray-400 text-xs">IP</p>
                    <p className="text-gray-700 dark:text-gray-300">{bug.location.ip}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachments */}
          {bug.attachmentUrls?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Attachments ({bug.attachmentUrls.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {bug.attachmentUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                    <img src={url} alt={`Attachment ${i + 1}`} className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* User Card */}
          {bug.user ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdPerson className="text-lg" /> Reported By
              </h3>
              <div className="flex items-center gap-3 mb-3">
                {bug.user.profilePhoto ? (
                  <img src={bug.user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-500">
                    {bug.user.fullName?.[0] || "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{bug.user.fullName}</p>
                  <p className="text-xs text-gray-500">@{bug.user.username}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
                <p>{bug.user.email}</p>
                {bug.user.phoneNumber && <p>{bug.user.phoneNumber}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/admin/users/${bug.user._id}`)}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center"
                >
                  View Profile
                </button>
                <button
                  onClick={() => setShowNotifForm(!showNotifForm)}
                  className="flex-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
                >
                  <MdSend className="text-sm" /> Notify
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MdPerson className="text-lg" /> Reported By
              </h3>
              <p className="text-sm text-gray-400">Anonymous user</p>
              {bug.email && <p className="text-xs text-gray-500 mt-1">{bug.email}</p>}
            </div>
          )}

          {/* Send Notification Form */}
          {showNotifForm && bug.user?._id && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdSend className="text-lg text-purple-500" /> Send Notification
              </h3>
              <form onSubmit={handleSendNotification} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Recipient</label>
                  <input
                    value={bug.user.fullName}
                    disabled
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Severity</label>
                  <select
                    value={notifSeverity}
                    onChange={(e) => setNotifSeverity(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Message</label>
                  <textarea
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    rows={3}
                    required
                    placeholder="Write a message to the user..."
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={sending || !notifMessage.trim()}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNotifForm(false)}
                    className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">ID</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs font-mono">{bug._id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Created</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">{new Date(bug.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-xs">Updated</span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">{new Date(bug.updatedAt).toLocaleString()}</span>
              </div>
              {bug.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Assigned To</span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs">{bug.assignedTo.fullName || bug.assignedTo}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
