import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Close,
  Star,
  StarBorder,
  StarHalf,
  VolunteerActivism,

  WorkspacePremium,
  School,
  People,
  Schedule,
  TrendingUp,
  VerifiedUser,
  GppBad,
} from "@mui/icons-material";
import { IconButton, CircularProgress } from "@mui/material";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { makeRequest } from "../../../../utils/apiHandlers";

const ExpertProfilePopup = ({ expertId, expertName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const colors = useSubscriptionColors();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const res = await makeRequest(
        "GET",
        `/api/v1/feedback/expert/${expertId}/profile-stats`
      );
      if (res?.error) {
        setLoading(false);
        return;
      }
      // res.data is { success, data: { expert, rating, ... } }
      const stats = res?.data?.data || res?.data;
      setData(stats);
      setLoading(false);
    };
    fetchStats();
  }, [expertId]);

  const renderStars = (rating) => {
    const stars = [];
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    for (let i = 0; i < full; i++)
      stars.push(<Star key={`f${i}`} sx={{ fontSize: 16, color: "#f59e0b" }} />);
    if (hasHalf)
      stars.push(<StarHalf key="h" sx={{ fontSize: 16, color: "#f59e0b" }} />);
    for (let i = 0; i < empty; i++)
      stars.push(<StarBorder key={`e${i}`} sx={{ fontSize: 16, color: "#9ca3af" }} />);
    return stars;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-light-primary dark:bg-dark-primary rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-text/10 dark:border-dark-text/10">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Expert Profile
          </h3>
          <IconButton onClick={onClose} size="small">
            <Close className="text-light-text/60 dark:text-dark-text/60" />
          </IconButton>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <CircularProgress size={32} sx={{ color: colors.third }} />
            </div>
          ) : !data ? (
            <div className="text-center py-12 text-light-text/50 dark:text-dark-text/50 text-sm">
              Failed to load expert profile
            </div>
          ) : (
            <>
              {/* Profile card */}
              <div className="flex items-center gap-4">
                {data.expert?.profilePhoto ? (
                  <img
                    src={data.expert.profilePhoto}
                    alt={data.expert.fullName}
                    className="w-16 h-16 rounded-full object-cover ring-2"
                    style={{ ringColor: colors.third }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                    style={{ color: colors.third, borderColor: colors.second, borderWidth: "2px", borderStyle: "solid" }}
                  >
                    {(data.expert?.fullName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-light-text dark:text-dark-text truncate">
                    {data.expert?.fullName || expertName}
                  </h4>
                  {data.expert?.username && (
                    <p className="text-xs text-light-text/50 dark:text-dark-text/50">
                      @{data.expert.username}
                    </p>
                  )}
                  {data.expert?.qualification && (
                    <div className="flex items-center gap-1 mt-1">
                      <School sx={{ fontSize: 14, color: colors.third }} />
                      <span className="text-xs text-light-text/60 dark:text-dark-text/60">
                        {data.expert.qualification}
                      </span>
                    </div>
                  )}
                  {/* KYC verification badge */}
                  <div className="flex items-center gap-1 mt-1">
                    {data.expert?.degreeVerified ? (
                      <>
                        <VerifiedUser sx={{ fontSize: 13, color: "#22c55e" }} />
                        <span className="text-[11px] font-medium text-green-500">KYC Verified</span>
                      </>
                    ) : (
                      <>
                        <GppBad sx={{ fontSize: 13, color: "#9ca3af" }} />
                        <span className="text-[11px] font-medium text-light-text/40 dark:text-dark-text/40">Not Verified</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {data.expert?.bio && (
                <p className="text-sm text-light-text/70 dark:text-dark-text/70 leading-relaxed">
                  {data.expert.bio}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Experience */}
                {data.expert?.experienceInYears != null && (
                  <StatCard
                    icon={<Schedule sx={{ fontSize: 18 }} />}
                    label="Experience"
                    value={`${data.expert.experienceInYears} yr${data.expert.experienceInYears !== 1 ? "s" : ""}`}
                    color={colors.third}
                  />
                )}
                {/* Customers */}
                {data.expert?.totalCustomersHandled != null && (
                  <StatCard
                    icon={<People sx={{ fontSize: 18 }} />}
                    label="Clients Helped"
                    value={data.expert.totalCustomersHandled}
                    color={colors.third}
                  />
                )}
                {/* Tips received — only show when there are completed tips */}
                {data.tips?.tipCount > 0 && (
                  <StatCard
                    icon={<VolunteerActivism sx={{ fontSize: 18 }} />}
                    label="Tips Received"
                    value={`${data.tips.tipCount} (${data.tips.uniqueTippers} people)`}
                    color={colors.third}
                  />
                )}

              </div>

              {/* Rating section */}
              <div className="rounded-xl p-4 bg-light-text/5 dark:bg-dark-text/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-light-text dark:text-dark-text">
                    Ratings
                  </span>
                  <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                    {data.rating?.totalRatings || 0} reviews
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl font-bold text-light-text dark:text-dark-text">
                    {(data.rating?.averageRating || 0).toFixed(1)}
                  </span>
                  <div className="flex">{renderStars(data.rating?.averageRating || 0)}</div>
                </div>
                {/* Star breakdown */}
                {data.rating?.totalRatings > 0 && (
                  <div className="space-y-1">
                    {[5, 4, 3, 2, 1].map((n) => {
                      const countKey = `${["one", "two", "three", "four", "five"][n - 1]}StarCount`;
                      const count = data.rating[countKey] || 0;
                      const pct = data.rating.totalRatings > 0
                        ? (count / data.rating.totalRatings) * 100
                        : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-xs">
                          <span className="w-3 text-right text-light-text/50 dark:text-dark-text/50">
                            {n}
                          </span>
                          <Star sx={{ fontSize: 12, color: "#f59e0b" }} />
                          <div className="flex-1 h-1.5 rounded-full bg-light-text/10 dark:bg-dark-text/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: colors.third,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right text-light-text/40 dark:text-dark-text/40">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Current user's rating */}
              {data.currentUserRating && (
                <div className="rounded-xl p-4 border border-light-text/10 dark:border-dark-text/10">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp sx={{ fontSize: 16, color: colors.third }} />
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">
                      Your Rating
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderStars(data.currentUserRating.stars)}
                    </div>
                    <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                      ({data.currentUserRating.stars}/5)
                    </span>
                  </div>
                  {data.currentUserRating.message && (
                    <p className="text-xs text-light-text/60 dark:text-dark-text/60 mt-1 italic">
                      "{data.currentUserRating.message}"
                    </p>
                  )}
                  {data.currentUserRating.aspects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.currentUserRating.aspects.map((a) => (
                        <span
                          key={a}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: colors.third }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Your tips to this expert */}
              {data.tips?.userTipCount > 0 && (
                <div className="rounded-xl p-4 border border-light-text/10 dark:border-dark-text/10">
                  <div className="flex items-center gap-2 mb-1">
                    <VolunteerActivism sx={{ fontSize: 16, color: colors.third }} />
                    <span className="text-sm font-medium text-light-text dark:text-dark-text">
                      Your Tips
                    </span>
                  </div>
                  <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                    You've tipped {data.tips.userTipCount} time{data.tips.userTipCount !== 1 ? "s" : ""} totaling{" "}
                    <span className="font-semibold" style={{ color: colors.third }}>
                      {"\u20B9"}{data.tips.userTipTotal}
                    </span>
                  </p>
                </div>
              )}

              {/* Recent reviews */}
              {data.recentReviews?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-light-text dark:text-dark-text mb-2">
                    Recent Reviews
                  </h4>
                  <div className="space-y-3">
                    {data.recentReviews.map((review) => (
                      <div
                        key={review._id}
                        className="rounded-lg p-3 bg-light-text/5 dark:bg-dark-text/5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-light-text/70 dark:text-dark-text/70">
                            {review.user?.fullName || "User"}
                          </span>
                          <div className="flex">
                            {renderStars(review.stars)}
                          </div>
                        </div>
                        {review.message && (
                          <p className="text-xs text-light-text/60 dark:text-dark-text/60 line-clamp-2">
                            {review.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating history */}
              {data.ratingHistory?.length > 1 && (
                <div>
                  <h4 className="text-sm font-medium text-light-text dark:text-dark-text mb-2">
                    Your Rating History
                  </h4>
                  <div className="space-y-1.5">
                    {data.ratingHistory.map((entry) => (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between text-xs text-light-text/50 dark:text-dark-text/50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              entry.action === "created"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-amber-500/10 text-amber-500"
                            }`}
                          >
                            {entry.action === "created" ? "New" : "Updated"}
                          </span>
                          <div className="flex">{renderStars(entry.stars)}</div>
                        </div>
                        <span>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="rounded-xl p-3 bg-light-text/5 dark:bg-dark-text/5">
    <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider text-light-text/40 dark:text-dark-text/40">
        {label}
      </span>
    </div>
    <div className="text-sm font-semibold text-light-text dark:text-dark-text">
      {value}
    </div>
  </div>
);

StatCard.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  color: PropTypes.string,
};

ExpertProfilePopup.propTypes = {
  expertId: PropTypes.string.isRequired,
  expertName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default ExpertProfilePopup;
