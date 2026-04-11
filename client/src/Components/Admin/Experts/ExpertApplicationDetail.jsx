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
  MdPerson, MdSend, MdRefresh, MdWork, MdSchool, MdVerified,
  MdLocationOn, MdEmail, MdPhone, MdLink, MdDescription,
  MdCheckCircle, MdCancel, MdEditNote, MdImage, MdPictureAsPdf,
} from "react-icons/md";
import { FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";

export default function ExpertApplicationDetail() {
  const { applicationId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const app = useSelector((state) => state.admin.data?.[`expertApp_${applicationId}`]);
  const loading = useSelector((state) => state.admin.loading?.[`expertApp_${applicationId}`]);

  // Review form
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Notification form
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifSeverity, setNotifSeverity] = useState("info");
  const [notifMessage, setNotifMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminData(
      `expertApp_${applicationId}`,
      `${ENDPOINTS.ADMIN.EXPERT_APPLICATIONS}/${applicationId}`
    ));
  }, [dispatch, applicationId]);

  const data = app?.application || app;

  const handleRefresh = () => {
    dispatch(fetchAdminData(
      `expertApp_${applicationId}`,
      `${ENDPOINTS.ADMIN.EXPERT_APPLICATIONS}/${applicationId}`
    ));
  };

  const handleReview = async (status) => {
    setReviewing(true);
    const result = await adminAction(
      "PUT",
      `${ENDPOINTS.ADMIN.EXPERT_APPLICATIONS}/${applicationId}/review`,
      { status, notes: reviewNotes || undefined }
    );
    dispatch(showNotification(
      result.success ? `Application ${status}` : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) {
      setReviewStatus("");
      setReviewNotes("");
      handleRefresh();
    }
    setReviewing(false);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    const userId = data?.user?._id;
    if (!userId) return;
    setSending(true);
    const result = await adminAction("POST", ENDPOINTS.ADMIN.SEND_USER_NOTIFICATION, {
      type: "system",
      severity: notifSeverity,
      title: `Regarding your expert application`,
      message: notifMessage,
      recipientId: userId,
    });
    dispatch(showNotification(
      result.success ? "Notification sent to applicant" : result.message,
      result.success ? "success" : "error"
    ));
    if (result.success) {
      setNotifMessage("");
      setShowNotifForm(false);
    }
    setSending(false);
  };

  const isReviewable = data && ["submitted", "under_review", "revisions_requested"].includes(data.status);

  const isFileImage = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i) || lower.includes("/image/");
  };

  const isPdf = (url) => {
    if (!url) return false;
    return url.toLowerCase().match(/\.pdf(\?|$)/i);
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
        <MdDescription className="text-5xl mx-auto mb-3 opacity-50" />
        <p className="text-lg">Application not found</p>
        <button onClick={() => navigate("/admin/experts")} className="mt-2 text-blue-500 text-sm">
          Back to Expert Management
        </button>
      </div>
    );
  }

  const { personalInfo = {}, professionalInfo = {}, verification = {}, reviewHistory = [] } = data;

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/admin/experts")} className="text-gray-400 hover:text-gray-600">
              <IoMdArrowBack className="text-xl" />
            </button>
            <span>Expert Application</span>
          </div>
        }
        subtitle={`#${applicationId?.slice(-8)} · ${data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "Draft"}`}
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

          {/* Status Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusBadge status={data.status} />
              {data.adminNotes && (
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Admin: {data.adminNotes}
                </span>
              )}
            </div>
            {data.reviewedAt && (
              <span className="text-xs text-gray-400">
                Reviewed: {new Date(data.reviewedAt).toLocaleString()}
              </span>
            )}
          </div>

          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MdPerson className="text-lg text-blue-500" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={personalInfo.fullName} icon={<MdPerson />} />
              <InfoRow label="Email" value={personalInfo.email} icon={<MdEmail />} />
              <InfoRow label="Phone" value={personalInfo.phone} icon={<MdPhone />} />
              <InfoRow label="Location" value={`${personalInfo.city || ""}${personalInfo.city && personalInfo.country ? ", " : ""}${personalInfo.country || ""}`} icon={<MdLocationOn />} />
            </div>
            {personalInfo.bio && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-1">Bio</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  {personalInfo.bio}
                </p>
              </div>
            )}
          </div>

          {/* Professional Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MdWork className="text-lg text-purple-500" /> Professional Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InfoRow label="Experience" value={`${professionalInfo.experienceInYears || 0} years`} icon={<MdWork />} />
              <InfoRow label="Qualification" value={professionalInfo.qualification} icon={<MdSchool />} />
            </div>

            {/* Specializations */}
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Specializations</p>
              <div className="flex flex-wrap gap-2">
                {(professionalInfo.specializations || []).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg font-medium"
                  >
                    {s}
                  </span>
                ))}
                {(!professionalInfo.specializations || professionalInfo.specializations.length === 0) && (
                  <span className="text-xs text-gray-400 italic">None specified</span>
                )}
              </div>
            </div>

            {/* Previous Work */}
            {professionalInfo.previousWork && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Previous Work / Experience</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  {professionalInfo.previousWork}
                </p>
              </div>
            )}

            {/* Social Links */}
            {(professionalInfo.socialLinks?.instagram || professionalInfo.socialLinks?.linkedin || professionalInfo.socialLinks?.website) && (
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Social Links</p>
                <div className="flex flex-wrap gap-2">
                  {professionalInfo.socialLinks.instagram && (
                    <a
                      href={professionalInfo.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 rounded-lg hover:bg-pink-100 transition-colors"
                    >
                      <FaInstagram /> Instagram
                    </a>
                  )}
                  {professionalInfo.socialLinks.linkedin && (
                    <a
                      href={professionalInfo.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FaLinkedin /> LinkedIn
                    </a>
                  )}
                  {professionalInfo.socialLinks.website && (
                    <a
                      href={professionalInfo.socialLinks.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <FaGlobe /> Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Portfolio URLs */}
            {professionalInfo.portfolioUrls?.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Portfolio</p>
                <div className="space-y-2">
                  {professionalInfo.portfolioUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600 hover:underline"
                    >
                      <MdLink className="text-base flex-shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Verification Documents */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <MdVerified className="text-lg text-green-500" /> Verification Documents
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Degree Certificate */}
              {verification.degreeFileUrl && (
                <FilePreview
                  label="Degree / Certificate"
                  url={verification.degreeFileUrl}
                  isImage={isFileImage(verification.degreeFileUrl)}
                  isPdf={isPdf(verification.degreeFileUrl)}
                  onImageClick={() => isFileImage(verification.degreeFileUrl) && setLightboxUrl(verification.degreeFileUrl)}
                />
              )}

              {/* ID Proof */}
              {verification.idProofUrl && (
                <FilePreview
                  label="ID Proof"
                  url={verification.idProofUrl}
                  isImage={isFileImage(verification.idProofUrl)}
                  isPdf={isPdf(verification.idProofUrl)}
                  onImageClick={() => isFileImage(verification.idProofUrl) && setLightboxUrl(verification.idProofUrl)}
                />
              )}
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                {verification.agreedToTerms ? (
                  <MdCheckCircle className="text-green-500" />
                ) : (
                  <MdCancel className="text-red-500" />
                )}
                <span className="text-gray-600 dark:text-gray-400 text-xs">
                  Terms {verification.agreedToTerms ? "Accepted" : "Not Accepted"}
                </span>
              </div>
              {verification.agreedAt && (
                <span className="text-xs text-gray-400">
                  on {new Date(verification.agreedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Review History */}
          {reviewHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <MdEditNote className="text-lg text-orange-500" /> Review History
              </h3>
              <div className="space-y-3">
                {reviewHistory.map((entry, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <StatusBadge status={entry.action} />
                        <span className="text-xs text-gray-400">
                          {entry.reviewedAt ? new Date(entry.reviewedAt).toLocaleString() : ""}
                        </span>
                      </div>
                      {entry.reviewedBy && (
                        <p className="text-xs text-gray-500">
                          by {entry.reviewedBy.fullName || entry.reviewedBy.username || entry.reviewedBy}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{entry.notes}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Applicant Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <MdPerson className="text-lg" /> Applicant
            </h3>
            <div className="flex items-center gap-3 mb-3">
              {data.user?.profilePhoto?.url || data.user?.profilePhoto ? (
                <img
                  src={data.user.profilePhoto?.url || data.user.profilePhoto}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-500">
                  {(data.user?.fullName || personalInfo.fullName)?.[0] || "?"}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {data.user?.fullName || personalInfo.fullName}
                </p>
                {data.user?.username && (
                  <p className="text-xs text-gray-500">@{data.user.username}</p>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
              <p>{data.user?.email || personalInfo.email}</p>
              {(data.user?.phone || personalInfo.phone) && <p>{data.user.phone || personalInfo.phone}</p>}
            </div>
            <div className="flex gap-2">
              {data.user?._id && (
                <button
                  onClick={() => navigate(`/admin/users/${data.user._id}`)}
                  className="flex-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-center"
                >
                  View Profile
                </button>
              )}
              <button
                onClick={() => setShowNotifForm(!showNotifForm)}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-1"
              >
                <MdSend className="text-sm" /> Notify
              </button>
            </div>
          </div>

          {/* Notification Form */}
          {showNotifForm && (data.user?._id) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MdSend className="text-lg text-purple-500" /> Send Notification
              </h3>
              <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                <MdPerson className="text-purple-500 text-sm flex-shrink-0" />
                <span className="text-xs text-purple-700 dark:text-purple-300 truncate">
                  To: {data.user?.fullName || personalInfo.fullName}
                </span>
                <span className="text-xs text-purple-400 font-mono ml-auto flex-shrink-0">{data.user?._id?.slice(-6)}</span>
              </div>
              <form onSubmit={handleSendNotification} className="space-y-3">
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
                    placeholder="Write a message to the applicant..."
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

          {/* Review Actions */}
          {isReviewable && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Review Application</h3>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Add review notes (optional for approval, recommended for rejection)..."
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-3"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleReview("approved")}
                  disabled={reviewing}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MdCheckCircle /> {reviewing ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => handleReview("revisions_requested")}
                  disabled={reviewing}
                  className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MdEditNote /> Request Revisions
                </button>
                <button
                  onClick={() => handleReview("rejected")}
                  disabled={reviewing}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <MdCancel /> Reject
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
              <MetaRow label="Submitted" value={data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "—"} />
              <MetaRow label="Reviewed" value={data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : "—"} />
              <MetaRow label="Created" value={new Date(data.createdAt).toLocaleString()} />
              <MetaRow label="Updated" value={new Date(data.updatedAt).toLocaleString()} />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl transition-colors"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Helper Components ──────────────────────────────────────────────────────── */

function InfoRow({ label, value, icon }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">{icon}</span>}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{value}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 text-xs">{label}</span>
      <span className={`text-gray-600 dark:text-gray-400 text-xs ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function FilePreview({ label, url, isImage, isPdf, onImageClick }) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 font-medium">{label}</p>
      {isImage ? (
        <div className="p-2">
          <img
            src={url}
            alt={label}
            className="w-full h-40 object-contain rounded cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 dark:bg-gray-900"
            onClick={onImageClick}
          />
        </div>
      ) : isPdf ? (
        <div className="p-3 flex items-center gap-3">
          <MdPictureAsPdf className="text-3xl text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{label}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Open PDF
            </a>
          </div>
        </div>
      ) : (
        <div className="p-3 flex items-center gap-3">
          <MdImage className="text-3xl text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline truncate block"
            >
              View Document
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
