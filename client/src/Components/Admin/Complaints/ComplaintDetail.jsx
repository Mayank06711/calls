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
import {
  MdPerson, MdSend, MdRefresh, MdReportProblem, MdCategory,
  MdChat, MdImage, MdCheckCircle, MdCancel, MdEditNote,
  MdOutlineReviews, MdGavel,
} from "react-icons/md";

const CATEGORY_COLORS = {
  harassment: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  fraud: "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  inappropriate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  spam: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  other: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
};

export default function ComplaintDetail() {
  const { complaintId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const complaint = useSelector((state) => state.admin.data?.[`complaint_${complaintId}`]);
  const loading = useSelector((state) => state.admin.loading?.[`complaint_${complaintId}`]);

  // Status update
  const [updating, setUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // Notification form
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifSeverity, setNotifSeverity] = useState("info");
  const [notifMessage, setNotifMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminData(
      `complaint_${complaintId}`,
      `${ENDPOINTS.ADMIN.COMPLAINT_DETAIL}/${complaintId}`
    ));
  }, [dispatch, complaintId]);

  const data = complaint?.complaint || complaint;

  useEffect(() => {
    if (data?.adminNotes) setAdminNotes(data.adminNotes);
  }, [data?.adminNotes]);

  const handleRefresh = () => {
    dispatch(fetchAdminData(
      `complaint_${complaintId}`,
      `${ENDPOINTS.ADMIN.COMPLAINT_DETAIL}/${complaintId}`
    ));
  };

  const handleUpdateStatus = async (status) => {
    setUpdating(true);
    const result = await adminAction(
      "PUT",
      `${ENDPOINTS.ADMIN.COMPLAINT_DETAIL}/${complaintId}`,
      { status, adminNotes: adminNotes || undefined }
    );
    dispatch(showNotification(
      result.success ? `Complaint ${status}` : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) handleRefresh();
    setUpdating(false);
  };

  const handleSendNotification = async (e, recipientId, recipientName) => {
    e.preventDefault();
    if (!recipientId) return;
    setSending(true);
    const result = await adminAction("POST", ENDPOINTS.ADMIN.SEND_USER_NOTIFICATION, {
      type: "system",
      severity: notifSeverity,
      title: `Regarding complaint #${complaintId.slice(-8)}`,
      message: notifMessage,
      recipientId,
    });
    dispatch(showNotification(
      result.success ? `Notification sent to ${recipientName}` : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) {
      setNotifMessage("");
      setShowNotifForm(false);
    }
    setSending(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <CircularProgress size={40} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MdReportProblem className="text-5xl mx-auto mb-3 opacity-50" />
        <p className="text-lg">Complaint not found</p>
        <button onClick={() => navigate("/admin/complaints")} className="mt-2 text-blue-500 text-sm">
          Back to Complaints
        </button>
      </div>
    );
  }

  const canUpdate = data.status !== "resolved" && data.status !== "dismissed";

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/complaints")} className="text-gray-400 hover:text-gray-600">
              <IoMdArrowBack className="text-xl" />
            </button>
            <span>Complaint Detail</span>
          </div>
        }
        subtitle={`#${complaintId?.slice(-8)} · ${new Date(data.createdAt).toLocaleString()}`}
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

          {/* Status + Category Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
            <StatusBadge status={data.status} />
            <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium capitalize ${CATEGORY_COLORS[data.category] || CATEGORY_COLORS.other}`}>
              {data.category || "other"}
            </span>
            {data.updatedAt !== data.createdAt && (
              <span className="text-xs text-gray-400 ml-auto">
                Updated: {new Date(data.updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Complaint Reason */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MdReportProblem className="text-lg text-red-500" /> Complaint Reason
            </h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {data.reason}
            </p>
          </div>

          {/* Admin Notes (if exists) */}
          {data.adminNotes && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 shadow-sm border border-blue-100 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                <MdEditNote className="text-lg" /> Admin Notes
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{data.adminNotes}</p>
            </div>
          )}

          {/* Chat Transcript */}
          {data.transcript?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <MdChat className="text-lg text-purple-500" /> Chat Transcript ({data.transcript.length} messages)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {data.transcript.map((msg, i) => {
                  const isComplainant = msg.sender === data.complainant?._id || msg.sender === data.complainant?.fullName;
                  return (
                    <div key={i} className={`flex ${isComplainant ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                        isComplainant
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                      }`}>
                        <p className="text-[10px] font-medium opacity-60 mb-0.5">{msg.sender || "Unknown"}</p>
                        {msg.type === "image" || msg.mediaUrl ? (
                          <img
                            src={msg.mediaUrl || msg.content}
                            alt="Media"
                            className="max-w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxUrl(msg.mediaUrl || msg.content)}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.timestamp && (
                          <p className="text-[10px] opacity-40 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Media Attachments */}
          {data.mediaUrls?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdImage className="text-lg text-green-500" /> Evidence / Attachments ({data.mediaUrls.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {data.mediaUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setLightboxUrl(url)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Complainant Card */}
          <UserCard
            label="Complainant"
            user={data.complainant}
            icon={<MdPerson className="text-lg text-blue-500" />}
            onViewProfile={() => data.complainant?._id && navigate(`/admin/users/${data.complainant._id}`)}
            onNotify={() => setShowNotifForm("complainant")}
          />

          {/* Expert Card */}
          <UserCard
            label="Expert (Accused)"
            user={data.expert}
            icon={<MdGavel className="text-lg text-red-500" />}
            onViewProfile={() => data.expert?._id && navigate(`/admin/users/${data.expert._id}`)}
            onNotify={() => setShowNotifForm("expert")}
          />

          {/* Notification Form */}
          {showNotifForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdSend className="text-lg text-purple-500" /> Send Notification
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                To: {showNotifForm === "complainant" ? data.complainant?.fullName : data.expert?.fullName}
              </p>
              <form onSubmit={(e) => handleSendNotification(
                e,
                showNotifForm === "complainant" ? data.complainant?._id : data.expert?._id,
                showNotifForm === "complainant" ? data.complainant?.fullName : data.expert?.fullName,
              )} className="space-y-3">
                <select
                  value={notifSeverity}
                  onChange={(e) => setNotifSeverity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <textarea
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  rows={3}
                  required
                  placeholder="Write a message..."
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={sending || !notifMessage.trim()} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button type="button" onClick={() => setShowNotifForm(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Status Update Actions */}
          {canUpdate && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdOutlineReviews className="text-lg" /> Update Status
              </h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Admin notes (optional)..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-3"
              />
              <div className="flex flex-col gap-2">
                {data.status === "new" && (
                  <button onClick={() => handleUpdateStatus("reviewing")} disabled={updating}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                    <MdOutlineReviews /> {updating ? "Updating..." : "Mark as Reviewing"}
                  </button>
                )}
                <button onClick={() => handleUpdateStatus("resolved")} disabled={updating}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                  <MdCheckCircle /> {updating ? "Updating..." : "Resolve"}
                </button>
                <button onClick={() => handleUpdateStatus("dismissed")} disabled={updating}
                  className="w-full py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                  <MdCancel /> {updating ? "Updating..." : "Dismiss"}
                </button>
              </div>
            </div>
          )}

          {/* Meta Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <MetaRow label="ID" value={data._id} mono />
              <MetaRow label="Status" value={data.status} />
              <MetaRow label="Category" value={data.category} />
              <MetaRow label="Created" value={new Date(data.createdAt).toLocaleString()} />
              <MetaRow label="Updated" value={new Date(data.updatedAt).toLocaleString()} />
              {data.chatId && <MetaRow label="Chat ID" value={data.chatId} mono />}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

/* Helper Components */

function UserCard({ label, user, icon, onViewProfile, onNotify }) {
  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">{icon} {label}</h3>
        <p className="text-sm text-gray-400">Unknown user</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">{icon} {label}</h3>
      <div className="flex items-center gap-3 mb-3">
        {user.profilePhoto ? (
          <img src={typeof user.profilePhoto === "object" ? user.profilePhoto.url : user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-500">
            {user.fullName?.[0] || "?"}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white">{user.fullName}</p>
          {user.username && <p className="text-xs text-gray-500">@{user.username}</p>}
        </div>
      </div>
      {user.email && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{user.email}</p>}
      <div className="flex gap-2">
        <button onClick={onViewProfile} className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center">
          View Profile
        </button>
        <button onClick={onNotify} className="flex-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1">
          <MdSend className="text-sm" /> Notify
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-gray-600 dark:text-gray-400 text-xs ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
    </div>
  );
}
