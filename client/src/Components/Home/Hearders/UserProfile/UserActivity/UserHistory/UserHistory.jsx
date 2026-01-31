import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  History,
  ArrowBack,
  Phone,
  CreditCard,
  Star,
  TrendingUp,
  AttachMoney,
  ReportProblem,
  Dashboard,
  VideoCall,
  AccessTime,
  CheckCircle,
  HourglassEmpty,
  PhoneMissed,
  ExpandMore,
  ExpandLess,
  Refresh,
} from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../../../utils/getSubscriptionColors';
import { makeRequest } from '../../../../../../utils/apiHandlers';
import { ENDPOINTS } from '../../../../../../constants/apiEndpoints';
import { useAIContext } from '../../../../../../context/AIContext';

// ─── Tab definitions ──────────────────────────────────────────
const USER_TABS = [
  { key: 'calls', label: 'Calls', icon: Phone },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'payments', label: 'Payments', icon: AttachMoney },
  { key: 'ratings', label: 'Ratings Given', icon: Star },
];

const EXPERT_TABS = [
  { key: 'summary', label: 'Dashboard', icon: Dashboard },
  { key: 'performance', label: 'Performance', icon: TrendingUp },
  { key: 'earnings', label: 'Earnings', icon: AttachMoney },
  { key: 'complaints', label: 'Complaints', icon: ReportProblem },
];

function UserHistory() {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);

  const tabs = isExpert ? EXPERT_TABS : USER_TABS;
  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  // Set AI context with a compact summary of the loaded history data
  useEffect(() => {
    if (!data || loading) return;

    let summary = `User is viewing ${activeTab} history.`;
    try {
      if (activeTab === "calls") {
        const stats = data.stats || {};
        const calls = data.calls || [];
        summary += ` Stats: ${stats.totalCalls || 0} total, ${stats.completedCalls || 0} completed, ${stats.missedCalls || 0} missed.`;
        if (calls.length > 0) {
          summary += " Recent: " + calls.slice(0, 5).map(c =>
            `${c.otherParticipant?.fullName || "Unknown"} - ${c.callType || "call"} (${c.status}, ${c.duration || 0}s)`
          ).join("; ");
        }
      } else if (activeTab === "payments") {
        const tipStats = data.tips?.stats || {};
        const subPayments = data.subscriptionPayments || [];
        summary += ` ${tipStats.tipCount || 0} tips sent (₹${tipStats.completedTips || 0} total). ${subPayments.length} subscription payments.`;
      } else if (activeTab === "subscriptions") {
        const current = data.currentSubscription;
        const history = data.history || [];
        summary += current ? ` Current plan: ${current.type || current.plan || "Unknown"}.` : " No active subscription.";
        summary += ` ${history.length} past subscription records.`;
      } else if (activeTab === "ratings") {
        const ratings = data.ratings || [];
        summary += ` ${ratings.length} ratings given.`;
      } else if (activeTab === "summary" && data) {
        summary += ` Expert dashboard summary available.`;
      } else if (activeTab === "performance" && data) {
        summary += ` Expert performance data available.`;
      } else if (activeTab === "earnings" && data) {
        summary += ` Expert earnings data available.`;
      } else if (activeTab === "complaints" && data) {
        summary += ` Expert complaints data available.`;
      }
    } catch { /* ignore formatting errors */ }

    setAIPageContext({
      page: "profile/history",
      description: summary,
    });

    return () => clearAIPageContext();
  }, [activeTab, data, loading]);

  const fetchData = useCallback(async (tab) => {
    const thisRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setData(null);

    const urlMap = {
      calls: ENDPOINTS.HISTORY.CALLS,
      subscriptions: ENDPOINTS.HISTORY.SUBSCRIPTIONS,
      payments: ENDPOINTS.HISTORY.PAYMENTS,
      ratings: ENDPOINTS.HISTORY.RATINGS,
      summary: ENDPOINTS.HISTORY.EXPERT_SUMMARY,
      performance: ENDPOINTS.HISTORY.EXPERT_PERFORMANCE,
      earnings: ENDPOINTS.HISTORY.EXPERT_EARNINGS,
      complaints: ENDPOINTS.HISTORY.EXPERT_COMPLAINTS,
    };

    const url = urlMap[tab];
    if (!url) { setLoading(false); return; }

    const res = await makeRequest('GET', url);
    // Ignore stale responses from previous tab switches
    if (thisRequestId !== requestIdRef.current) return;

    if (res?.error) {
      setError(res.error?.message || 'Failed to load data');
    } else {
      setData(res?.data?.data || res?.data || null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab, fetchData]);

  return (
    <div className="p-2 sm:p-4 md:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors dark:text-dark-text text-light-text"
        >
          <ArrowBack />
        </button>
        <div className="flex items-center dark:text-dark-text text-light-text">
          <span className="mr-2" style={{ color: colors.fourth }}>
            <History />
          </span>
          <h1 className="text-xl font-semibold">History</h1>
        </div>
        <button
          onClick={() => fetchData(activeTab)}
          className="ml-auto p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Refresh"
        >
          <Refresh className={`dark:text-gray-400 text-gray-500 ${loading ? 'animate-spin' : ''}`} sx={{ fontSize: 20 }} />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { if (tab.key === activeTab) return; setData(null); setActiveTab(tab.key); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'dark:text-gray-400 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              style={isActive ? { backgroundColor: colors.fourth } : {}}
            >
              <Icon sx={{ fontSize: 18 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white/5 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 shadow border border-white/10 dark:border-gray-700 flex-1 overflow-auto">
        {loading && <LoadingState colors={colors} />}
        {error && <ErrorState message={error} onRetry={() => fetchData(activeTab)} colors={colors} />}
        {!loading && !error && data && (
          <>
            {activeTab === 'calls' && <CallHistory data={data} colors={colors} />}
            {activeTab === 'subscriptions' && <SubscriptionHistory data={data} colors={colors} />}
            {activeTab === 'payments' && <PaymentHistory data={data} colors={colors} />}
            {activeTab === 'ratings' && <RatingsGiven data={data} colors={colors} />}
            {activeTab === 'summary' && <ExpertSummary data={data} colors={colors} />}
            {activeTab === 'performance' && <ExpertPerformance data={data} colors={colors} />}
            {activeTab === 'earnings' && <ExpertEarnings data={data} colors={colors} />}
            {activeTab === 'complaints' && <ExpertComplaints data={data} colors={colors} />}
          </>
        )}
        {!loading && !error && !data && <EmptyState colors={colors} />}
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────

function LoadingState({ colors }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div
        className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${colors.fourth}60`, borderTopColor: 'transparent' }}
      />
      <p className="text-sm dark:text-gray-400 text-gray-500">Loading...</p>
    </div>
  );
}

function ErrorState({ message, onRetry, colors }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <ReportProblem sx={{ fontSize: 40 }} className="text-red-400" />
      <p className="text-sm text-red-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 rounded-lg text-sm text-white"
        style={{ backgroundColor: colors.fourth }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ colors }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <History sx={{ fontSize: 40 }} style={{ color: `${colors.fourth}60` }} />
      <p className="text-sm dark:text-gray-400 text-gray-500">No data available yet</p>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, colors, sub }) {
  return (
    <div className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/30 border border-white/5 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon sx={{ fontSize: 16 }} style={{ color: colors.fourth }} />}
        <span className="text-xs dark:text-gray-400 text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold dark:text-dark-text text-light-text">{value}</p>
      {sub && <p className="text-xs dark:text-gray-500 text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function CollapsibleSection({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-2 text-left">
        <span className="text-sm font-semibold dark:text-dark-text text-light-text">
          {title}
          {count != null && (
            <span className="text-xs dark:text-gray-500 text-gray-400 font-normal ml-1">({count})</span>
          )}
        </span>
        {open ? (
          <ExpandLess sx={{ fontSize: 18 }} className="dark:text-gray-400 text-gray-500" />
        ) : (
          <ExpandMore sx={{ fontSize: 18 }} className="dark:text-gray-400 text-gray-500" />
        )}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  if (amount == null) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

// ─── User: Call History ───────────────────────────────────────

function CallHistory({ data, colors }) {
  const stats = data.stats || {};
  const calls = data.calls || [];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Calls" value={stats.totalCalls || 0} icon={Phone} colors={colors} />
        <StatCard label="Completed" value={stats.completedCalls || 0} icon={CheckCircle} colors={colors} />
        <StatCard label="Missed" value={stats.missedCalls || 0} icon={PhoneMissed} colors={colors} />
        <StatCard label="Total Duration" value={formatDuration(stats.totalDurationSeconds)} icon={AccessTime} colors={colors} />
      </div>

      {calls.length === 0 ? (
        <p className="text-center text-sm dark:text-gray-400 text-gray-500 py-6">No calls yet</p>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  call.status === 'completed'
                    ? 'bg-green-500/20'
                    : call.status === 'missed'
                    ? 'bg-red-500/20'
                    : 'bg-yellow-500/20'
                }`}
              >
                {call.status === 'completed' ? (
                  <VideoCall sx={{ fontSize: 18 }} className="text-green-400" />
                ) : call.status === 'missed' ? (
                  <PhoneMissed sx={{ fontSize: 18 }} className="text-red-400" />
                ) : (
                  <HourglassEmpty sx={{ fontSize: 18 }} className="text-yellow-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                  {call.caller?.fullName || call.callee?.fullName || 'Unknown'}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-400">
                  {formatDate(call.createdAt)}
                  {call.duration ? ` - ${formatDuration(call.duration)}` : ''}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  call.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : call.status === 'missed'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {call.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User: Subscription History ───────────────────────────────

function SubscriptionHistory({ data, colors }) {
  const current = data.currentSubscription;
  const history = data.history || [];
  const stats = data.statistics;

  return (
    <div>
      {current && (
        <div
          className="p-4 rounded-lg mb-4 border"
          style={{ borderColor: `${colors.fourth}40`, backgroundColor: `${colors.fourth}10` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CreditCard sx={{ fontSize: 20 }} style={{ color: colors.fourth }} />
            <span className="text-sm font-semibold dark:text-dark-text text-light-text">Current Plan</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold" style={{ color: colors.fourth }}>
                {current.type || current.planType || 'Active'}
              </p>
              <p className="text-xs dark:text-gray-400 text-gray-500">
                {current.startDate && `Since ${formatDate(current.startDate)}`}
                {current.endDate && ` - Expires ${formatDate(current.endDate)}`}
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
              {current.status || 'Active'}
            </span>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <StatCard label="Total Spent" value={formatCurrency(stats.totalSpent)} icon={AttachMoney} colors={colors} />
          <StatCard label="Plans Used" value={stats.totalPlans || 0} icon={CreditCard} colors={colors} />
          {stats.totalConsultations != null && (
            <StatCard label="Consultations" value={stats.totalConsultations} icon={VideoCall} colors={colors} />
          )}
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-center text-sm dark:text-gray-400 text-gray-500 py-6">No subscription history</p>
      ) : (
        <div className="space-y-2">
          {history.map((sub, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.fourth}20` }}
              >
                <CreditCard sx={{ fontSize: 18 }} style={{ color: colors.fourth }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-dark-text text-light-text">{sub.type || 'Plan'}</p>
                <p className="text-xs dark:text-gray-500 text-gray-400">
                  {formatDate(sub.startDate)}
                  {sub.endDate && ` - ${formatDate(sub.endDate)}`}
                </p>
              </div>
              {sub.amount != null && (
                <span className="text-sm font-medium dark:text-dark-text text-light-text">
                  {formatCurrency(sub.amount)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── User: Payment History ────────────────────────────────────

function PaymentHistory({ data, colors }) {
  const tips = data.tips || {};
  const subscriptionPayments = data.subscriptionPayments || [];
  const tipItems = tips.items || [];
  const tipStats = tips.stats || {};

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="Tips Sent" value={tipStats.tipCount || 0} icon={AttachMoney} colors={colors} />
        <StatCard label="Total Tipped" value={formatCurrency(tipStats.completedTips)} icon={AttachMoney} colors={colors} />
        <StatCard label="Sub Payments" value={subscriptionPayments.length} icon={CreditCard} colors={colors} />
      </div>

      {subscriptionPayments.length > 0 && (
        <CollapsibleSection title="Subscription Payments" count={subscriptionPayments.length} defaultOpen>
          <div className="space-y-2">
            {subscriptionPayments.map((p, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <CreditCard sx={{ fontSize: 18 }} style={{ color: colors.fourth }} />
                <div className="flex-1">
                  <p className="text-sm dark:text-dark-text text-light-text">{p.planType || 'Subscription'}</p>
                  <p className="text-xs dark:text-gray-500 text-gray-400">{formatDate(p.date)}</p>
                </div>
                <span className="text-sm font-medium dark:text-dark-text text-light-text">
                  {formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {tipItems.length > 0 && (
        <CollapsibleSection title="Tips Sent" count={tips.total || tipItems.length}>
          <div className="space-y-2">
            {tipItems.map((tip) => (
              <div key={tip._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <Star sx={{ fontSize: 18 }} className="text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm dark:text-dark-text text-light-text truncate">
                    {tip.expert?.fullName || 'Expert'}
                  </p>
                  <p className="text-xs dark:text-gray-500 text-gray-400">{formatDate(tip.createdAt)}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-sm font-medium dark:text-dark-text text-light-text">
                    {formatCurrency(tip.amount)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tip.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    tip.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {tip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {tipItems.length === 0 && subscriptionPayments.length === 0 && (
        <p className="text-center text-sm dark:text-gray-400 text-gray-500 py-6">No payment history</p>
      )}
    </div>
  );
}

// ─── User: Ratings Given ──────────────────────────────────────

function RatingsGiven({ data, colors }) {
  const ratings = data.ratings || [];

  return (
    <div>
      {ratings.length === 0 ? (
        <p className="text-center text-sm dark:text-gray-400 text-gray-500 py-6">No ratings given yet</p>
      ) : (
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Star sx={{ fontSize: 18 }} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                  {r.expert?.fullName || 'Expert'}
                </p>
                <p className="text-xs dark:text-gray-500 text-gray-400">{formatDate(r.createdAt)}</p>
                {r.message && (
                  <p className="text-xs dark:text-gray-400 text-gray-500 mt-1 line-clamp-2">{r.message}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    sx={{ fontSize: 14 }}
                    className={i < (r.stars || 0) ? 'text-amber-400' : 'text-gray-600'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Expert: Summary Dashboard ────────────────────────────────

function ExpertSummary({ data, colors }) {
  const profile = data.profile || {};
  const rating = data.rating || {};
  const calls = data.calls || {};
  const tips = data.tips || {};

  return (
    <div>
      <div
        className="p-4 rounded-lg mb-4 border"
        style={{ borderColor: `${colors.fourth}40`, backgroundColor: `${colors.fourth}08` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${colors.fourth}20` }}
          >
            <Dashboard sx={{ fontSize: 24 }} style={{ color: colors.fourth }} />
          </div>
          <div>
            <p className="text-sm dark:text-gray-400 text-gray-500">
              {profile.qualification || 'Expert'}
              {profile.degree?.key ? ` - ${profile.degree.key}` : ''}
            </p>
            <p className="text-xs dark:text-gray-500 text-gray-400">
              {profile.experienceInYears ? `${profile.experienceInYears} years experience` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Earnings" value={formatCurrency(data.totalEarnings)} icon={AttachMoney} colors={colors} />
        <StatCard label="Call Earnings" value={formatCurrency(calls.earnings)} icon={Phone} colors={colors} />
        <StatCard label="Tip Earnings" value={formatCurrency(tips.total)} icon={Star} colors={colors} />
        <StatCard label="Total Calls" value={calls.total || 0} icon={VideoCall} colors={colors} />
        <StatCard label="Total Hours" value={`${calls.totalHours || 0}h`} icon={AccessTime} colors={colors} />
        <StatCard
          label="Avg Rating"
          value={(rating.averageRating || 0).toFixed(1)}
          icon={Star}
          colors={colors}
          sub={`${rating.totalRatings || 0} ratings`}
        />
        <StatCard label="Tips Received" value={tips.count || 0} icon={AttachMoney} colors={colors} />
        <StatCard label="Customers" value={profile.totalCustomersHandled || 0} icon={CheckCircle} colors={colors} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/30 border border-white/5 dark:border-gray-700">
          <p className="text-xs dark:text-gray-400 text-gray-500 mb-1">Complaints Against</p>
          <p
            className={`text-lg font-bold ${
              (data.complaints || 0) > 0 ? 'text-red-400' : 'dark:text-dark-text text-light-text'
            }`}
          >
            {data.complaints || 0}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/30 border border-white/5 dark:border-gray-700">
          <p className="text-xs dark:text-gray-400 text-gray-500 mb-1">Block Requests Filed</p>
          <p className="text-lg font-bold dark:text-dark-text text-light-text">{data.blockRequests || 0}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Expert: Performance ──────────────────────────────────────

function ExpertPerformance({ data, colors }) {
  const ratingStats = data.ratingStats || {};
  const aspectBreakdown = data.aspectBreakdown || [];
  const ratingTrend = data.ratingTrend || [];
  const recentReviews = data.recentReviews || [];

  return (
    <div>
      <div className="flex items-center gap-4 p-4 rounded-lg mb-4" style={{ backgroundColor: `${colors.fourth}08` }}>
        <div className="text-center">
          <p className="text-3xl font-bold" style={{ color: colors.fourth }}>
            {(ratingStats.averageRating || 0).toFixed(1)}
          </p>
          <div className="flex gap-0.5 mt-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                sx={{ fontSize: 14 }}
                className={i < Math.round(ratingStats.averageRating || 0) ? 'text-amber-400' : 'text-gray-600'}
              />
            ))}
          </div>
          <p className="text-xs dark:text-gray-400 text-gray-500 mt-1">{ratingStats.totalRatings || 0} total</p>
        </div>

        {aspectBreakdown.length > 0 && (
          <div className="flex-1 space-y-1.5">
            {aspectBreakdown.slice(0, 5).map((a) => (
              <div key={a._id} className="flex items-center gap-2">
                <span className="text-xs dark:text-gray-400 text-gray-500 w-24 truncate">{a._id}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-700/30 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (a.count / (ratingStats.totalRatings || 1)) * 100)}%`,
                      backgroundColor: colors.fourth,
                    }}
                  />
                </div>
                <span className="text-xs dark:text-gray-500 text-gray-400 w-6 text-right">{a.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {ratingTrend.length > 0 && (
        <CollapsibleSection title="Monthly Trend" count={ratingTrend.length} defaultOpen>
          <div className="space-y-1.5">
            {ratingTrend.map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xs dark:text-gray-400 text-gray-500 w-16">
                  {t._id?.month || '?'}/{t._id?.year || '?'}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-700/30 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${((t.avgRating || 0) / 5) * 100}%`, backgroundColor: colors.fourth }}
                  />
                </div>
                <span className="text-xs dark:text-gray-400 text-gray-500 w-10 text-right">
                  {(t.avgRating || 0).toFixed(1)} ({t.count || 0})
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {recentReviews.length > 0 && (
        <CollapsibleSection title="Recent Reviews" count={recentReviews.length}>
          <div className="space-y-2">
            {recentReviews.map((r) => (
              <div key={r._id} className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium dark:text-dark-text text-light-text">
                    {r.user?.fullName || 'User'}
                  </span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        sx={{ fontSize: 12 }}
                        className={i < (r.stars || 0) ? 'text-amber-400' : 'text-gray-600'}
                      />
                    ))}
                  </div>
                </div>
                {r.message && <p className="text-xs dark:text-gray-400 text-gray-500 line-clamp-2">{r.message}</p>}
                <p className="text-xs dark:text-gray-600 text-gray-300 mt-1">{formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ─── Expert: Earnings ─────────────────────────────────────────

function ExpertEarnings({ data, colors }) {
  const summary = data.summary || {};
  const trends = data.trends || {};
  const recentTips = data.recentTips || [];
  const callTrend = trends.calls || [];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Earnings" value={formatCurrency(summary.totalEarnings)} icon={AttachMoney} colors={colors} />
        <StatCard label="Call Earnings" value={formatCurrency(summary.callEarnings)} icon={Phone} colors={colors} />
        <StatCard label="Tip Earnings" value={formatCurrency(summary.tipEarnings)} icon={Star} colors={colors} />
        <StatCard label="Total Calls" value={summary.totalCalls || 0} icon={VideoCall} colors={colors} />
        <StatCard label="Total Hours" value={`${summary.totalHours || 0}h`} icon={AccessTime} colors={colors} />
        <StatCard label="Avg Call" value={`${summary.avgCallMinutes || 0}m`} icon={AccessTime} colors={colors} />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 mb-4">
        <StatCard label="Tips Received" value={summary.tipCount || 0} colors={colors} />
        <StatCard label="Unique Tippers" value={summary.uniqueTippers || 0} colors={colors} />
        <StatCard label="Avg Tip" value={formatCurrency(summary.avgTip)} colors={colors} />
      </div>

      {callTrend.length > 0 && (
        <CollapsibleSection title="Monthly Call Earnings" count={callTrend.length} defaultOpen>
          <div className="space-y-1.5">
            {(() => {
              const maxEarnings = Math.max(...callTrend.map((x) => x.earnings || 0), 1);
              return callTrend.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xs dark:text-gray-400 text-gray-500 w-16">
                    {t._id?.month || '?'}/{t._id?.year || '?'}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-gray-700/30 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: colors.fourth,
                        width: `${Math.min(100, ((t.earnings || 0) / maxEarnings) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs dark:text-gray-400 text-gray-500 w-20 text-right">
                    {formatCurrency(t.earnings)} ({t.calls || 0})
                  </span>
                </div>
              ));
            })()}
          </div>
        </CollapsibleSection>
      )}

      {recentTips.length > 0 && (
        <CollapsibleSection title="Recent Tips" count={recentTips.length}>
          <div className="space-y-2">
            {recentTips.map((tip) => (
              <div key={tip._id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <Star sx={{ fontSize: 18 }} className="text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm dark:text-dark-text text-light-text truncate">
                    {tip.tipper?.fullName || 'User'}
                  </p>
                  <p className="text-xs dark:text-gray-500 text-gray-400">{formatDate(tip.createdAt)}</p>
                  {tip.message && (
                    <p className="text-xs dark:text-gray-400 text-gray-500 mt-0.5 line-clamp-1">{tip.message}</p>
                  )}
                </div>
                <span className="text-sm font-bold" style={{ color: colors.fourth }}>
                  {formatCurrency(tip.amount)}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

// ─── Expert: Complaints ───────────────────────────────────────

function ExpertComplaints({ data, colors }) {
  const complaints = data.complaints || {};
  const blockRequests = data.blockRequests || {};
  const complaintItems = complaints.items || [];
  const blockItems = blockRequests.items || [];
  const statusBreakdown = complaints.statusBreakdown || [];

  const statusColor = (status) => {
    if (status === 'resolved') return 'bg-green-500/20 text-green-400';
    if (status === 'dismissed') return 'bg-gray-500/20 text-gray-400';
    if (status === 'reviewing') return 'bg-blue-500/20 text-blue-400';
    if (status === 'approved') return 'bg-green-500/20 text-green-400';
    if (status === 'rejected') return 'bg-red-500/20 text-red-400';
    return 'bg-yellow-500/20 text-yellow-400';
  };

  return (
    <div>
      {statusBreakdown.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {statusBreakdown.map((s) => (
            <div key={s._id} className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColor(s._id)}`}>
              {s._id}: {s.count}
            </div>
          ))}
        </div>
      )}

      <CollapsibleSection title="Complaints Against You" count={complaints.total || 0} defaultOpen>
        {complaintItems.length === 0 ? (
          <p className="text-sm dark:text-gray-400 text-gray-500 py-3 text-center">No complaints</p>
        ) : (
          <div className="space-y-2">
            {complaintItems.map((c) => (
              <div key={c._id} className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm dark:text-dark-text text-light-text">
                    {c.complainant?.fullName || 'User'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                </div>
                <p className="text-xs dark:text-gray-500 text-gray-400">{c.category}</p>
                <p className="text-xs dark:text-gray-400 text-gray-500 mt-1 line-clamp-2">{c.reason}</p>
                <p className="text-xs dark:text-gray-600 text-gray-300 mt-1">{formatDate(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Block Requests Filed" count={blockRequests.total || 0}>
        {blockItems.length === 0 ? (
          <p className="text-sm dark:text-gray-400 text-gray-500 py-3 text-center">No block requests</p>
        ) : (
          <div className="space-y-2">
            {blockItems.map((b) => (
              <div key={b._id} className="p-3 rounded-lg bg-white/5 dark:bg-gray-700/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm dark:text-dark-text text-light-text">
                    {b.blockedUser?.fullName || 'User'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(b.status)}`}>{b.status}</span>
                </div>
                <p className="text-xs dark:text-gray-400 text-gray-500 line-clamp-2">{b.reason}</p>
                <p className="text-xs dark:text-gray-600 text-gray-300 mt-1">{formatDate(b.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}

export default UserHistory;
