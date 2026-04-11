import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import ConfirmDialog from "../Common/ConfirmDialog";
import { showNotification } from "../../../redux/actions";
import { MdFeedback, MdStar, MdBugReport, MdRefresh } from "react-icons/md";

export default function FeedbackList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState("bug");

  const bugFeedback = useSelector((state) => state.admin.data?.bugFeedback);
  const bugLoading = useSelector((state) => state.admin.loading?.bugFeedback);
  const expertReviews = useSelector((state) => state.admin.data?.expertReviews);
  const reviewsLoading = useSelector((state) => state.admin.loading?.expertReviews);
  const reviewStats = useSelector((state) => state.admin.data?.reviewStats);
  const [bugPage, setBugPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [hasUserFilter, setHasUserFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  useEffect(() => {
    dispatch(fetchAdminData("reviewStats", ENDPOINTS.ADMIN.FEEDBACK_EXPERT_REVIEWS_STATS));
  }, [dispatch]);

  useEffect(() => {
    if (tab === "bug") {
      const params = { page: bugPage, limit: 20 };
      if (hasUserFilter) params.hasUser = hasUserFilter;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      dispatch(fetchAdminData("bugFeedback", ENDPOINTS.ADMIN.BUG_REPORTS, params));
    } else {
      dispatch(fetchAdminData("expertReviews", ENDPOINTS.ADMIN.FEEDBACK_EXPERT_REVIEWS, { page: reviewPage, limit: 20 }));
    }
  }, [dispatch, tab, bugPage, reviewPage, hasUserFilter, statusFilter, severityFilter]);

  const handleRefresh = () => {
    dispatch(fetchAdminData("reviewStats", ENDPOINTS.ADMIN.FEEDBACK_EXPERT_REVIEWS_STATS));
    if (tab === "bug") {
      const params = { page: bugPage, limit: 20 };
      if (hasUserFilter) params.hasUser = hasUserFilter;
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      dispatch(fetchAdminData("bugFeedback", ENDPOINTS.ADMIN.BUG_REPORTS, params));
    } else {
      dispatch(fetchAdminData("expertReviews", ENDPOINTS.ADMIN.FEEDBACK_EXPERT_REVIEWS, { page: reviewPage, limit: 20 }));
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await adminAction("DELETE", `${ENDPOINTS.ADMIN.FEEDBACK_DELETE_REVIEW}/${deleteTarget}`);
    dispatch(showNotification(result.success ? "Review deleted" : result.message, result.success ? "success" : "error"));
    if (result.success) dispatch(fetchAdminData("expertReviews", ENDPOINTS.ADMIN.FEEDBACK_EXPERT_REVIEWS, { page: reviewPage, limit: 20 }));
    setDeleting(false);
    setDeleteTarget(null);
  };

  const severityColor = (s) => {
    switch (s) {
      case "Critical": return "bg-red-100 text-red-700";
      case "High": return "bg-orange-100 text-orange-700";
      case "Medium": return "bg-yellow-100 text-yellow-700";
      case "Low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const bugColumns = [
    { key: "user", label: "User", render: (r) => r.user?.fullName || r.email || "Anonymous" },
    { key: "bugType", label: "Bug Type", render: (r) => <StatusBadge status={r.bugType || "Other"} /> },
    {
      key: "severity", label: "Severity",
      render: (r) => (
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${severityColor(r.severity)}`}>
          {r.severity || "Medium"}
        </span>
      ),
    },
    { key: "message", label: "Message", render: (r) => <span className="line-clamp-2 text-xs">{r.message || "—"}</span> },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status || "New"} /> },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const reviewColumns = [
    { key: "user", label: "Reviewer", render: (r) => r.user?.fullName || "Unknown" },
    { key: "expert", label: "Expert", render: (r) => r.expert?.fullName || "Unknown" },
    {
      key: "stars", label: "Rating",
      render: (r) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">{"★".repeat(r.stars || 0)}</span>
          <span className="text-gray-300">{"★".repeat(5 - (r.stars || 0))}</span>
        </div>
      ),
    },
    { key: "message", label: "Review", render: (r) => <span className="line-clamp-2 text-xs">{r.message || "—"}</span> },
    {
      key: "actions", label: "",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(r._id); }}
          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Feedback Management"
        subtitle="Bug reports and expert reviews"
        actions={
          <button
            onClick={handleRefresh}
            disabled={bugLoading || reviewsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${bugLoading || reviewsLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Avg Expert Rating" value={reviewStats?.overallAvgRating?.toFixed(1) || "—"} icon={MdStar} color="orange" />
        <StatCard title="Total Reviews" value={reviewStats?.totalReviews || 0} icon={MdFeedback} color="blue" />
        <StatCard title="Bug Reports" value={bugFeedback?.total || "—"} icon={MdBugReport} color="red" />
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
        {[{ key: "bug", label: "Bug Reports" }, { key: "reviews", label: "Expert Reviews" }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm transition-colors ${tab === t.key ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bug" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={hasUserFilter}
              onChange={(e) => { setHasUserFilter(e.target.value); setBugPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Users</option>
              <option value="yes">Logged-in Users</option>
              <option value="no">Anonymous</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setBugPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Statuses</option>
              {["New", "In Progress", "Fixed", "Won't Fix", "Duplicate", "Cannot Reproduce"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setBugPage(1); }}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Severities</option>
              {["Critical", "High", "Medium", "Low"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <DataTable
            columns={bugColumns}
            data={bugFeedback?.feedback || []}
            loading={bugLoading}
            page={bugPage}
            pages={bugFeedback?.pages}
            total={bugFeedback?.total}
            onPageChange={setBugPage}
            onRowClick={(row) => navigate(`/admin/feedback/${row._id}`)}
            emptyMessage="No bug reports"
          />
        </>
      )}

      {tab === "reviews" && (
        <DataTable columns={reviewColumns} data={expertReviews?.reviews || []} loading={reviewsLoading} page={reviewPage} pages={expertReviews?.pages} total={expertReviews?.total} onPageChange={setReviewPage} emptyMessage="No expert reviews" />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Review"
        message="This will permanently remove this expert review. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteReview}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
