import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAdminData, adminAction } from "../../../redux/thunks/admin.thunks";
import { ENDPOINTS } from "../../../constants/apiEndpoints";
import PageHeader from "../Common/PageHeader";
import DataTable from "../Common/DataTable";
import StatusBadge from "../Common/StatusBadge";
import StatCard from "../Common/StatCard";
import { showNotification } from "../../../redux/actions";
import { FaUserTie } from "react-icons/fa";
import { MdPendingActions, MdCheckCircle, MdBlock, MdRefresh } from "react-icons/md";

export default function ExpertList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState("applications");

  const applications = useSelector((state) => state.admin.data?.expertApplications);
  const appsLoading = useSelector((state) => state.admin.loading?.expertApplications);
  const blockRequests = useSelector((state) => state.admin.data?.blockRequests);
  const blockLoading = useSelector((state) => state.admin.loading?.blockRequests);
  const expertStats = useSelector((state) => state.admin.data?.expertDashStats);

  const [appPage, setAppPage] = useState(1);
  const [appStatus, setAppStatus] = useState("");

  const fetchData = useCallback(() => {
    dispatch(fetchAdminData("expertDashStats", ENDPOINTS.ADMIN.DASHBOARD_EXPERT_STATS));
    if (tab === "applications") {
      const params = { page: appPage, limit: 20 };
      if (appStatus) params.status = appStatus;
      dispatch(fetchAdminData("expertApplications", ENDPOINTS.ADMIN.EXPERT_APPLICATIONS, params));
    } else if (tab === "block-requests") {
      dispatch(fetchAdminData("blockRequests", ENDPOINTS.ADMIN.EXPERT_BLOCK_REQUESTS));
    }
  }, [dispatch, tab, appPage, appStatus]);

  useEffect(() => {
    dispatch(fetchAdminData("expertDashStats", ENDPOINTS.ADMIN.DASHBOARD_EXPERT_STATS));
  }, [dispatch]);

  useEffect(() => {
    if (tab === "applications") {
      const params = { page: appPage, limit: 20 };
      if (appStatus) params.status = appStatus;
      dispatch(fetchAdminData("expertApplications", ENDPOINTS.ADMIN.EXPERT_APPLICATIONS, params));
    } else if (tab === "block-requests") {
      dispatch(fetchAdminData("blockRequests", ENDPOINTS.ADMIN.EXPERT_BLOCK_REQUESTS));
    }
  }, [dispatch, tab, appPage, appStatus]);

  const handleReview = async (applicationId, status) => {
    const result = await adminAction("PUT", `${ENDPOINTS.ADMIN.EXPERT_APPLICATIONS}/${applicationId}/review`, {
      status,
      notes: status === "approved" ? "Approved by admin" : "Reviewed",
    });
    dispatch(showNotification(result.success ? `Application ${status}` : result.message, result.success ? "success" : "error"));
    if (result.success) {
      const params = { page: appPage, limit: 20 };
      if (appStatus) params.status = appStatus;
      dispatch(fetchAdminData("expertApplications", ENDPOINTS.ADMIN.EXPERT_APPLICATIONS, params));
    }
  };

  const appColumns = [
    {
      key: "user", label: "Applicant",
      render: (r) => (
        <div>
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{r.user?.fullName || r.personalInfo?.fullName || "Unknown"}</p>
          <p className="text-xs text-gray-400">{r.user?.email || r.personalInfo?.email || ""}</p>
        </div>
      ),
    },
    { key: "experience", label: "Experience", render: (r) => `${r.professionalInfo?.experienceInYears || 0} yrs` },
    {
      key: "specializations", label: "Specializations",
      render: (r) => {
        const specs = r.professionalInfo?.specializations || [];
        return (
          <div className="flex flex-wrap gap-1">
            {specs.slice(0, 2).map((s, i) => (
              <span key={i} className="text-xs px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded">
                {s}
              </span>
            ))}
            {specs.length > 2 && <span className="text-xs text-gray-400">+{specs.length - 2}</span>}
          </div>
        );
      },
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions", label: "Actions",
      render: (r) => r.status === "submitted" || r.status === "under_review" ? (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleReview(r._id, "approved"); }}
            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
          >
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleReview(r._id, "rejected"); }}
            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            Reject
          </button>
        </div>
      ) : null,
    },
    {
      key: "submittedAt", label: "Submitted",
      render: (r) => r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—",
    },
  ];

  const blockColumns = [
    { key: "expert", label: "Expert", render: (r) => r.expertId?.userId?.fullName || r.expertId?.user?.fullName || "Unknown" },
    { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status || "pending"} /> },
    { key: "createdAt", label: "Requested", render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ];

  const stats = expertStats || {};

  return (
    <div>
      <PageHeader
        title="Expert Management"
        subtitle="Applications, experts, and block requests"
        actions={
          <button
            onClick={fetchData}
            disabled={appsLoading || blockLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdRefresh className={`text-lg ${appsLoading || blockLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Experts" value={stats.totalExperts} icon={FaUserTie} color="purple" />
        <StatCard title="Pending Applications" value={stats.byStatus?.find(s => s.status === "submitted")?.count || 0} icon={MdPendingActions} color="orange" />
        <StatCard title="Approved" value={stats.byStatus?.find(s => s.status === "approved")?.count || 0} icon={MdCheckCircle} color="green" />
        <StatCard title="Avg Rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"} icon={FaUserTie} color="teal" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-4">
        {[
          { key: "applications", label: "Applications" },
          { key: "block-requests", label: "Block Requests" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2 text-sm transition-colors ${tab === t.key ? "text-blue-600 border-b-2 border-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "applications" && (
        <>
          <div className="flex gap-2 mb-4">
            <select
              value={appStatus}
              onChange={(e) => { setAppStatus(e.target.value); setAppPage(1); }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <DataTable
            columns={appColumns}
            data={applications?.applications || []}
            loading={appsLoading}
            page={applications?.page}
            pages={applications?.pages}
            total={applications?.total}
            onPageChange={setAppPage}
            onRowClick={(row) => navigate(`/admin/experts/applications/${row._id}`)}
            emptyMessage="No applications found"
          />
        </>
      )}

      {tab === "block-requests" && (
        <DataTable
          columns={blockColumns}
          data={blockRequests?.data || blockRequests || []}
          loading={blockLoading}
          emptyMessage="No block requests"
        />
      )}
    </div>
  );
}
