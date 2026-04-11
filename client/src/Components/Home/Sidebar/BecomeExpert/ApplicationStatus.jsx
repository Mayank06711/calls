import { ArrowBack, CheckCircle, Cancel, HourglassTop, EditNote, Undo, RemoveCircleOutline, RateReview } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { APPLICATION_STATUSES } from "../../../../constants/expertConstants";

const STATUS_CONFIG = {
  [APPLICATION_STATUSES.SUBMITTED]: {
    label: "Submitted",
    color: "#3b82f6",
    bg: "bg-blue-500/8 dark:bg-blue-500/10",
    border: "border-blue-500/15 dark:border-blue-400/15",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    icon: HourglassTop,
    description: "Your application has been submitted and is waiting for admin review.",
  },
  [APPLICATION_STATUSES.UNDER_REVIEW]: {
    label: "Under Review",
    color: "#eab308",
    bg: "bg-yellow-500/8 dark:bg-yellow-500/10",
    border: "border-yellow-500/15 dark:border-yellow-400/15",
    iconBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    icon: RateReview,
    description: "An admin is currently reviewing your application.",
  },
  [APPLICATION_STATUSES.APPROVED]: {
    label: "Approved",
    color: "#22c55e",
    bg: "bg-emerald-500/8 dark:bg-emerald-500/10",
    border: "border-emerald-500/15 dark:border-emerald-400/15",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    icon: CheckCircle,
    description: "Congratulations! Your expert application has been approved.",
  },
  [APPLICATION_STATUSES.REJECTED]: {
    label: "Rejected",
    color: "#ef4444",
    bg: "bg-red-500/8 dark:bg-red-500/10",
    border: "border-red-500/15 dark:border-red-400/15",
    iconBg: "bg-red-500/10 dark:bg-red-500/15",
    icon: Cancel,
    description: "Unfortunately, your application was not approved at this time.",
  },
  [APPLICATION_STATUSES.REVISIONS_REQUESTED]: {
    label: "Revisions Requested",
    color: "#f97316",
    bg: "bg-orange-500/8 dark:bg-orange-500/10",
    border: "border-orange-500/15 dark:border-orange-400/15",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    icon: EditNote,
    description: "The admin has requested changes to your application.",
  },
  [APPLICATION_STATUSES.WITHDRAWN]: {
    label: "Withdrawn",
    color: "#6b7280",
    bg: "bg-gray-500/8 dark:bg-gray-500/10",
    border: "border-gray-500/15 dark:border-gray-400/15",
    iconBg: "bg-gray-500/10 dark:bg-gray-500/15",
    icon: RemoveCircleOutline,
    description: "You withdrew this application. You can submit a new one anytime.",
  },
};

function ApplicationStatus({ application, onEdit, onWithdraw }) {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();

  if (!application) return null;

  const config = STATUS_CONFIG[application.status] || STATUS_CONFIG[APPLICATION_STATUSES.SUBMITTED];
  const Icon = config.icon;
  const canWithdraw = ["submitted", "under_review"].includes(application.status);
  const canEdit = application.status === APPLICATION_STATUSES.REVISIONS_REQUESTED;
  const isTerminal = ["approved", "rejected"].includes(application.status);

  // Build timeline
  const timelineSteps = [
    { key: "submitted", label: "Submitted", date: application.submittedAt },
    { key: "under_review", label: "Under Review", date: application.reviewHistory?.find((r) => r.action === "under_review")?.reviewedAt },
    {
      key: application.status === "rejected" ? "rejected" : "approved",
      label: application.status === "rejected" ? "Rejected" : "Approved",
      date: isTerminal ? application.reviewedAt : null,
    },
  ];

  const currentIdx = application.status === "submitted" ? 0
    : application.status === "under_review" ? 1
    : isTerminal ? 2
    : application.status === "revisions_requested" ? 1
    : 0;

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 dark:bg-dark-primary bg-light-secondary border-b dark:border-dark-text/10 border-light-text/10">
        <div className="flex items-center gap-3">
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBack style={{ color: colors.fourth }} />
          </IconButton>
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">Application Status</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        {/* Status card */}
        <div className={`rounded-xl p-5 border ${config.bg} ${config.border}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${config.iconBg}`}>
              <Icon style={{ fontSize: 24, color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold dark:text-dark-text text-light-text">{config.label}</h3>
              <p className="text-xs dark:text-dark-text/50 text-light-text/50 mt-0.5">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Admin notes — prominent for revisions_requested */}
        {application.adminNotes && (
          <div className="rounded-lg p-3.5 border border-orange-500/15 dark:border-orange-400/15 bg-orange-500/5 dark:bg-orange-500/8">
            <div className="flex items-start gap-2.5">
              <span className="text-orange-500 mt-px flex-shrink-0">
                <EditNote style={{ fontSize: 18 }} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-orange-500 dark:text-orange-400 mb-1">Admin Feedback</p>
                <p className="text-[13px] dark:text-dark-text/80 text-light-text/80 leading-relaxed">{application.adminNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider dark:text-dark-text/40 text-light-text/40 mb-3">Progress</p>
          <div className="space-y-0 ml-1">
            {timelineSteps.map((s, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={s.key} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all"
                      style={{
                        backgroundColor: done ? config.color : "transparent",
                        border: done ? "none" : `2px solid ${toRgba(colors.fourth, 0.2)}`,
                        boxShadow: isCurrent ? `0 0 0 4px ${toRgba(config.color, 0.15)}` : "none",
                      }}
                    />
                    {i < timelineSteps.length - 1 && (
                      <div
                        className="w-px h-7"
                        style={{ backgroundColor: i < currentIdx ? toRgba(config.color, 0.3) : toRgba(colors.fourth, 0.1) }}
                      />
                    )}
                  </div>
                  <div className="-mt-1">
                    <p className={`text-xs font-medium ${done ? "dark:text-dark-text text-light-text" : "dark:text-dark-text/25 text-light-text/25"}`}>
                      {s.label}
                    </p>
                    {s.date && done && (
                      <p className="text-[10px] dark:text-dark-text/30 text-light-text/30 mt-px">
                        {new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review history */}
        {application.reviewHistory?.length > 0 && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider dark:text-dark-text/40 text-light-text/40 mb-2.5">Review History</p>
            <div className="space-y-1.5">
              {application.reviewHistory.map((entry, i) => {
                const entryConfig = STATUS_CONFIG[entry.action];
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 px-2.5 rounded-md dark:bg-white/[0.02] bg-black/[0.02]">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: toRgba(entryConfig?.color || colors.fourth, 0.1),
                        color: entryConfig?.color || colors.fourth,
                      }}
                    >
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    {entry.notes && (
                      <span className="text-[11px] dark:text-dark-text/40 text-light-text/40 truncate flex-1">{entry.notes}</span>
                    )}
                    <span className="text-[10px] dark:text-dark-text/25 text-light-text/25 flex-shrink-0 ml-auto">
                      {new Date(entry.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              style={{ backgroundColor: colors.fourth }}
            >
              <EditNote style={{ fontSize: 16 }} /> Edit & Resubmit
            </button>
          )}
          {canWithdraw && (
            <button
              onClick={onWithdraw}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border hover:opacity-80 transition-all dark:text-dark-text/60 text-light-text/60"
              style={{ borderColor: toRgba(colors.fourth, 0.15) }}
            >
              <Undo style={{ fontSize: 16 }} /> Withdraw
            </button>
          )}
          {(application.status === APPLICATION_STATUSES.REJECTED || application.status === APPLICATION_STATUSES.WITHDRAWN) && (
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              style={{ backgroundColor: colors.fourth }}
            >
              Reapply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicationStatus;
