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
  MdPerson, MdRefresh, MdSubscriptions, MdPayment,
  MdCalendarToday, MdReceipt, MdExtension, MdSend,
} from "react-icons/md";

export default function SubscriptionDetail() {
  const { subscriptionId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const data = useSelector((state) => state.admin.data?.[`sub_${subscriptionId}`]);
  const loading = useSelector((state) => state.admin.loading?.[`sub_${subscriptionId}`]);
  const userHistory = useSelector((state) => state.admin.data?.[`subHistory_${subscriptionId}`]);

  // Extend
  const [showExtend, setShowExtend] = useState(false);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState("");
  const [extending, setExtending] = useState(false);

  // Notification
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifSeverity, setNotifSeverity] = useState("info");
  const [notifMessage, setNotifMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminData(
      `sub_${subscriptionId}`,
      `${ENDPOINTS.ADMIN.SUBSCRIPTION_DETAIL}/${subscriptionId}`
    ));
  }, [dispatch, subscriptionId]);

  const sub = data?.subscription || data;

  // Fetch user's subscription history once we have the userId
  useEffect(() => {
    if (sub?.userId?._id && !userHistory) {
      dispatch(fetchAdminData(
        `subHistory_${subscriptionId}`,
        `${ENDPOINTS.ADMIN.SUBSCRIPTION_USER}/${sub.userId._id}`
      ));
    }
  }, [dispatch, sub?.userId?._id, subscriptionId, userHistory]);

  const handleRefresh = () => {
    dispatch(fetchAdminData(`sub_${subscriptionId}`, `${ENDPOINTS.ADMIN.SUBSCRIPTION_DETAIL}/${subscriptionId}`));
  };

  const handleExtend = async () => {
    if (!extendReason) return;
    setExtending(true);
    const result = await adminAction("PATCH", `${ENDPOINTS.ADMIN.SUBSCRIPTION_EXTEND}/${subscriptionId}/extend`, {
      days: extendDays, reason: extendReason,
    });
    dispatch(showNotification(result.success ? "Subscription extended" : result.message, result.success ? "success" : "error"));
    if (result.success) { setShowExtend(false); setExtendReason(""); handleRefresh(); }
    setExtending(false);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!sub?.userId?._id) return;
    setSending(true);
    const result = await adminAction("POST", ENDPOINTS.ADMIN.SEND_USER_NOTIFICATION, {
      type: "system",
      severity: notifSeverity,
      title: `Regarding your ${sub.type} subscription`,
      message: notifMessage,
      recipientId: sub.userId._id,
    });
    dispatch(showNotification(result.success ? `Notification sent` : result.message, result.success ? "success" : "error"));
    if (result.success) { setNotifMessage(""); setShowNotifForm(false); }
    setSending(false);
  };

  if (loading && !sub) {
    return <div className="flex items-center justify-center py-32"><CircularProgress size={40} /></div>;
  }

  if (!sub) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MdSubscriptions className="text-5xl mx-auto mb-3 opacity-50" />
        <p className="text-lg">Subscription not found</p>
        <button onClick={() => navigate("/admin/subscriptions")} className="mt-2 text-blue-500 text-sm">Back to Subscriptions</button>
      </div>
    );
  }

  const user = sub.userId;
  const daysRemaining = sub.status === "Active" && sub.endDate ? Math.max(0, Math.ceil((new Date(sub.endDate) - Date.now()) / 86400000)) : 0;
  const history = userHistory?.history || [];

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/subscriptions")} className="text-gray-400 hover:text-gray-600"><IoMdArrowBack className="text-xl" /></button>
            <span>Subscription Detail</span>
          </div>
        }
        subtitle={`#${subscriptionId?.slice(-8)} · ${sub.type} Plan`}
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

          {/* Status Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <StatusBadge status={sub.status} />
              <StatusBadge status={sub.paymentStatus || "—"} />
              <span className="px-2.5 py-0.5 text-xs rounded-full font-semibold capitalize bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                {sub.type}
              </span>
              {sub.status === "Active" && (
                <span className="ml-auto text-sm font-medium text-green-600 dark:text-green-400">
                  {daysRemaining} days remaining
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoBox label="Amount" value={sub.amount ? `₹${sub.amount.toLocaleString()}` : "—"} icon={<MdPayment className="text-green-500" />} />
              <InfoBox label="Duration" value={`${sub.durationInDays || "—"} days`} icon={<MdCalendarToday className="text-blue-500" />} />
              <InfoBox label="Start Date" value={sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"} icon={<MdCalendarToday className="text-purple-500" />} />
              <InfoBox label="End Date" value={sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "—"} icon={<MdCalendarToday className="text-orange-500" />} />
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MdReceipt className="text-lg text-green-500" /> Payment Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetaRow label="Payment Status" value={sub.paymentStatus} />
              <MetaRow label="Payment ID" value={sub.paymentId} mono />
              <MetaRow label="Transaction ID" value={sub.transactionId} mono />
              <MetaRow label="Payment Method" value={sub.paymentMethod} />
              {sub.referralDiscount > 0 && <MetaRow label="Referral Discount" value={`${sub.referralDiscount}%`} />}
              {sub.extraValidityDays > 0 && <MetaRow label="Extra Validity" value={`${sub.extraValidityDays} days`} />}
            </div>
          </div>

          {/* Subscription History for this user */}
          {history.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                User Subscription History ({history.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((h) => (
                  <div
                    key={h._id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${h._id === subscriptionId ? "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700" : "bg-gray-50 dark:bg-gray-700/50"} cursor-pointer hover:opacity-80`}
                    onClick={() => h._id !== subscriptionId && navigate(`/admin/subscriptions/${h._id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{h.type}</span>
                      <StatusBadge status={h.status} />
                      {h._id === subscriptionId && <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded">Current</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>₹{h.amount}</span>
                      <span>{new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <MetaRow label="Subscription ID" value={sub._id} mono />
              <MetaRow label="Created" value={new Date(sub.createdAt).toLocaleString()} />
              <MetaRow label="Updated" value={new Date(sub.updatedAt).toLocaleString()} />
              {sub.referralId && <MetaRow label="Referral ID" value={sub.referralId} mono />}
              {sub.historyId && <MetaRow label="History ID" value={sub.historyId} mono />}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* User Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MdPerson className="text-lg text-blue-500" /> Subscriber
            </h3>
            {user && typeof user === "object" ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {user.profilePhoto ? (
                    <img src={typeof user.profilePhoto === "object" ? user.profilePhoto.url : user.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600">
                      {user.fullName?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{user.fullName}</p>
                    {user.username && <p className="text-xs text-gray-500">@{user.username}</p>}
                  </div>
                </div>
                {user.email && <p className="text-xs text-gray-500 mb-1">{user.email}</p>}
                {user.phone && <p className="text-xs text-gray-500 mb-3">{user.phone}</p>}
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/admin/users/${user._id}`)} className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center">
                    View Profile
                  </button>
                  <button onClick={() => setShowNotifForm(!showNotifForm)} className="flex-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1">
                    <MdSend className="text-sm" /> Notify
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">User data unavailable</p>
            )}
          </div>

          {/* Notification Form */}
          {showNotifForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdSend className="text-lg text-purple-500" /> Send Notification
              </h3>
              <p className="text-xs text-gray-500 mb-3">To: {user?.fullName}</p>
              <form onSubmit={handleSendNotification} className="space-y-3">
                <select value={notifSeverity} onChange={(e) => setNotifSeverity(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} rows={3} required placeholder="Write a message..." className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
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

          {/* Extend Subscription */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MdExtension className="text-lg text-blue-500" /> Extend Subscription
            </h3>
            {showExtend ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Days to extend</label>
                  <input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} min={1} max={365} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Reason</label>
                  <input type="text" value={extendReason} onChange={(e) => setExtendReason(e.target.value)} placeholder="Reason for extension" className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExtend} disabled={extending || !extendReason} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {extending ? "Extending..." : "Extend"}
                  </button>
                  <button onClick={() => setShowExtend(false)} className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowExtend(true)} className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                Extend Subscription
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, icon }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">{icon} {label}</div>
      <p className="text-sm font-medium text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-gray-600 dark:text-gray-400 text-xs ${mono ? "font-mono" : ""} truncate max-w-[60%] text-right`}>{value || "—"}</span>
    </div>
  );
}
