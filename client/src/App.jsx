import { useEffect, useState, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { decrementTimer } from "./redux/actions/login.actions";
import {
  clearUserId,
  setUserId,
  setUserInfo,
} from "./redux/actions/auth.actions";
import { setSubscriptionType } from "./redux/actions/subscription.action";
import { fetchSettingsThunk } from "./redux/thunks/settings.thunk";
import { applyFontSize, applyFontFamily, dbValueToFontSize } from "./constants/styleOptions";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

// ── Eager imports (needed immediately on every page load) ────────────────────
import Toast from "./Components/Notification/Toast";
import { createTheme, ThemeProvider } from "@mui/material";
import { NotificationProvider } from "./hooks/useNotifications";
import { showNotification } from "./redux/actions";
import { SocketProvider } from "./socket/SocketContext";
import { VideoCallProvider } from "./hooks/useVideoCall";
import Feedback from "./Components/Feedback/Feedback";

// ── Lazy-loaded route components ─────────────────────────────────────────────
const Login = lazy(() => import("./Components/Login/Login"));
const LandingPage = lazy(() => import("./Components/Landing/LandingPage"));
const Home = lazy(() => import("./Components/Home/Home"));
const Missing = lazy(() => import("./Components/Missing"));
const UserInfoForm = lazy(() => import("./Components/Login/UserInfoForm"));
const Chats = lazy(() => import("./Components/Home/Sidebar/Chats/Chats"));
// const Reels = lazy(() => import("./Components/Home/Sidebar/Reels/Reels"));
const Subscriptions = lazy(() => import("./Components/Home/Sidebar/Subscriptions/Subscriptions"));
const WardrobeHub = lazy(() => import("./Components/Home/Sidebar/Wardrobe/WardrobeHub"));
const StyleProfile = lazy(() => import("./Components/Home/Sidebar/Wardrobe/StyleProfile"));
const MyCloset = lazy(() => import("./Components/Home/Sidebar/Wardrobe/MyCloset/MyCloset"));
const FullOutfit = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Suggestions/FullOutfit"));
const FromItem = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Suggestions/FromItem"));
const SuggestHub = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Suggestions/SuggestHub"));
const Pairings = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Pairings/Pairings"));
const OutfitBuilder = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Builder/OutfitBuilder"));
const OutfitList = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Outfits/OutfitList"));
const OutfitDetail = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Outfits/OutfitDetail"));
const WearLogPage = lazy(() => import("./Components/Home/Sidebar/Wardrobe/WearLog/WearLog"));
const ShopPage = lazy(() => import("./Components/Home/Sidebar/Wardrobe/Shop/Shop"));
const UserProfile = lazy(() => import("./Components/Home/Hearders/UserProfile/UserProfile"));
const NotificationPanel = lazy(() => import("./Components/Home/Hearders/Notifications/NotificationPanel"));
const UserSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/UserSettings"));
const UserHistory = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserHistory/UserHistory"));
// const Likes = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/Likes/Likes"));
// const Posts = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/Posts/Posts"));
const SilverSubscription = lazy(() => import("./Components/Home/Sidebar/Subscriptions/SubscriptionType/SilverSubscription"));
const PlatinumSubscription = lazy(() => import("./Components/Home/Sidebar/Subscriptions/SubscriptionType/PlatinumSubscription"));
const GoldSubscription = lazy(() => import("./Components/Home/Sidebar/Subscriptions/SubscriptionType/GoldSubscription"));
const AccountSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/AccountSettings"));
const ThemeSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/ThemeSettings"));
const NotificationSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/NotificationSettings"));
const PrivacySettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/PrivacySettings"));
const PreferenceSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/PreferenceSettings"));
const LayoutSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/LayoutSettings"));
const AccessibilitySettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/AccessibilitySettings"));
const SessionSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/SessionSettings"));
const UsageSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/UsageSettings"));
const ReelsSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/ReelsSettings"));
const AnalyticsSettings = lazy(() => import("./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/SettingTypes/AnalyticsSettings"));
const VideoCall = lazy(() => import("./Components/Home/VideoCall/VideoCall"));
const IncomingCall = lazy(() => import("./Components/Home/VideoCall/IncomingCall"));
const CallErrorModal = lazy(() => import("./Components/Home/VideoCall/CallErrorModal"));
const ExpertPermissionRequest = lazy(() => import("./Components/Home/VideoCall/ExpertPermissionRequest"));
const ExpertPermissionStatus = lazy(() => import("./Components/Home/VideoCall/ExpertPermissionStatus"));
const TermsAndConditions = lazy(() => import("./Components/Legal/TermsAndConditions"));
const PrivacyPolicy = lazy(() => import("./Components/Legal/PrivacyPolicy"));
const SharedOutfitPage = lazy(() => import("./Components/Public/SharedOutfitPage"));
const BecomeExpert = lazy(() => import("./Components/Home/Sidebar/BecomeExpert/BecomeExpert"));
const ExpertProfileEdit = lazy(() => import("./Components/Home/Sidebar/BecomeExpert/ExpertProfileEdit"));

// ── Admin module (lazy-loaded) ──────────────────────────────────────────────
const AdminLayout = lazy(() => import("./Components/Admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./Components/Admin/Dashboard/AdminDashboard"));
const UserList = lazy(() => import("./Components/Admin/Users/UserList"));
const UserDetail = lazy(() => import("./Components/Admin/Users/UserDetail"));
const ExpertList = lazy(() => import("./Components/Admin/Experts/ExpertList"));
const ExpertApplicationDetail = lazy(() => import("./Components/Admin/Experts/ExpertApplicationDetail"));
const SubscriptionList = lazy(() => import("./Components/Admin/Subscriptions/SubscriptionList"));
const SubscriptionDetail = lazy(() => import("./Components/Admin/Subscriptions/SubscriptionDetail"));
const FeedbackList = lazy(() => import("./Components/Admin/Feedback/FeedbackList"));
const BugDetail = lazy(() => import("./Components/Admin/Feedback/BugDetail"));
const ComplaintList = lazy(() => import("./Components/Admin/Complaints/ComplaintList"));
const ComplaintDetail = lazy(() => import("./Components/Admin/Complaints/ComplaintDetail"));
const NotificationList = lazy(() => import("./Components/Admin/Notifications/NotificationList"));
const SessionList = lazy(() => import("./Components/Admin/Sessions/SessionList"));
const WardrobeAnalytics = lazy(() => import("./Components/Admin/Wardrobe/WardrobeAnalytics"));
const AdminTeam = lazy(() => import("./Components/Admin/Team/AdminTeam"));

// ── Suspense fallback skeleton (full-page loads: landing, login, public pages) ─
const Sh = ({ className }) => (
  <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700/40 ${className}`} />
);

const LoginLoader = () => (
  <div className="flex items-center justify-center min-h-screen dark:bg-dark-primary bg-light-secondary">
    <div className="w-[450px] max-w-[calc(100vw-16px)] rounded-2xl overflow-hidden shadow-lg"
      style={{ height: "80vh", maxHeight: 700, background: "linear-gradient(180deg, #86efac 0%, #FFFFFF 50%)" }}>
      {/* Banner */}
      <div className="w-full h-[30px]" />
      {/* Logo + title */}
      <div className="flex items-center justify-center gap-2 mb-3 mt-1">
        <Sh className="w-8 h-8 rounded-lg !bg-white/40" />
        <Sh className="w-36 h-5 !bg-white/40" />
      </div>
      {/* Image area */}
      <div className="flex items-center justify-center px-6">
        <Sh className="w-full h-40 sm:h-48 rounded-lg !bg-white/30" />
      </div>
      {/* Tab bar */}
      <div className="flex gap-0 mx-6 mt-4">
        <Sh className="flex-1 h-9 rounded-l-lg !bg-green-200/50" />
        <Sh className="flex-1 h-9 rounded-r-lg !bg-gray-200/50" />
      </div>
      {/* Input + button area */}
      <div className="flex flex-col items-center gap-3 pt-8 px-6">
        <Sh className="w-full max-w-[340px] h-[46px] rounded-xl" />
        <Sh className="w-full max-w-[340px] h-[42px] rounded-xl !bg-green-200/60" />
        <Sh className="w-24 h-3 rounded" />
        {/* OR divider */}
        <div className="flex items-center gap-3 w-full max-w-[340px]">
          <div className="flex-1 h-px bg-gray-200" />
          <Sh className="w-6 h-3 rounded" />
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        {/* Google button */}
        <Sh className="w-full max-w-[340px] h-[42px] rounded-xl" />
      </div>
    </div>
  </div>
);

const PageLoader = () => (
  <div className="w-full h-screen dark:bg-dark-primary bg-light-secondary overflow-hidden">
    {/* Navbar skeleton */}
    <div className="flex items-center justify-between px-6 py-4 border-b dark:border-dark-text/10 border-light-text/10">
      <Sh className="w-28 h-7" />
      <div className="flex items-center gap-4">
        <Sh className="w-16 h-4" />
        <Sh className="w-16 h-4" />
        <Sh className="w-20 h-9 rounded-full" />
      </div>
    </div>
    {/* Hero skeleton */}
    <div className="flex items-center justify-between max-w-6xl mx-auto px-6 pt-16">
      <div className="flex-1 space-y-5 max-w-xl">
        <Sh className="w-3/4 h-10" />
        <Sh className="w-full h-6" />
        <Sh className="w-2/3 h-4" />
        <div className="flex gap-3 pt-4">
          <Sh className="w-36 h-12 rounded-full" />
          <Sh className="w-32 h-12 rounded-full" />
        </div>
      </div>
      <div className="hidden md:block flex-shrink-0">
        <Sh className="w-72 h-80 rounded-2xl" />
      </div>
    </div>
  </div>
);

// Listens for custom 'app:navigate' events (e.g. from browser notification clicks)
// and performs client-side navigation without a full page reload.
function NavigationListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => navigate(e.detail.path);
    window.addEventListener('app:navigate', handler);
    return () => window.removeEventListener('app:navigate', handler);
  }, [navigate]);
  return null;
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#059212", // Your green color
    },
    success: {
      main: "#059212",
    },
    error: {
      main: "#d32f2f",
    },
    warning: {
      main: "#ed6c02",
    },
    info: {
      main: "#0288d1",
    },
  },
});

const App = () => {
  console.log("[App] Mounting App component");
  const userId = useSelector((state) => state.auth.userId);
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const dispatch = useDispatch();
  const [isAuthInitializing, setIsAuthInitializing] = useState(true); // 🔐 Prevent redirect during initial load
  const {
    // otpGenerated, // removed unused
    otpVerified,
    isAlreadyVerified,
    // otpVerificationInProgress, // removed unused
    timer,
    isTimerActive,
  } = useSelector((state) => state.auth);

  // 🔐 Load userId from localStorage BEFORE allowing route redirects
  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedUserInfo = localStorage.getItem("userInfo");

    if (savedUserId) {
      dispatch(setUserId(savedUserId));
      
      // Fetch settings from backend when user is logged in (this will apply font size and family too)
      dispatch(fetchSettingsThunk()).then((result) => {
        // Apply font size from fetched settings (always apply, even for medium/default)
        if (result?.data?.accessibility?.fontSize !== undefined) {
          const fontSizeString = dbValueToFontSize(result.data.accessibility.fontSize);
          applyFontSize(fontSizeString);
          console.log("Applied font size on app load:", fontSizeString, "from DB value:", result.data.accessibility.fontSize);
        }
        // Apply font family from fetched settings
        if (result?.data?.accessibility?.fontFamily) {
          applyFontFamily(result.data.accessibility.fontFamily);
          console.log("Applied font family on app load:", result.data.accessibility.fontFamily);
        }
      });
    }
    if (savedUserInfo) {
      const userInfo = JSON.parse(savedUserInfo);
      dispatch(setUserInfo(userInfo));
      
      // Also set subscription type for colors
      if (userInfo?.subscription?.type) {
        dispatch(setSubscriptionType(userInfo.subscription.type.toUpperCase()));
      }
    }
    
    // ✅ Mark auth initialization as complete (regardless of whether user was found)
    setIsAuthInitializing(false);
  }, [dispatch]);

  useEffect(() => {
    let timeoutId;
    if (isTimerActive && timer > 0) {
      timeoutId = setTimeout(() => {
        dispatch(decrementTimer());
      }, 1000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timer, isTimerActive, dispatch]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token" && event.oldValue && !event.newValue) {
        // Token was removed user logout in another tab.
        // SocketManager.disconnectSocket();
        dispatch(clearUserId());
        dispatch(showNotification("Logged out in another tab", "info"));
      } else {
        if (event.key === "token" && !event.oldValue && event.newValue) {
          // token was added in anoter tab ,login
          dispatch(setUserId(localStorage.getItem("userId")));
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch]);

  // The entire app is now wrapped in SocketProvider for socket context
  return (
    <ThemeProvider theme={theme}>
      {console.log("[App] Rendering with SocketProvider")}
      <SocketProvider>
        {/* SocketProvider manages socket connection, authentication, and exposes context */}
        <VideoCallProvider>
        <NotificationProvider>
        <Router>
          <NavigationListener />
          <div className='relative min-h-screen'>
            <Toast />
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                path='/'
                element={
                  // 🔐 Show loading while checking localStorage for auth
                  isAuthInitializing ? (
                    <div className="flex items-center justify-center h-screen">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : userId ? (
                    !isAlreadyVerified && otpVerified ? (
                      <Navigate to='/complete-profile' />
                    ) : (
                      <Home />
                    )
                  ) : (
                    <LandingPage />
                  )
                }
              >
                {/* Nested routes for main content area - NO leading slash! */}
                <Route index element={<Chats />} />
                <Route path='chats' element={<Chats />} />
                <Route path='chats/:userId' element={<Chats />} />
                {/* <Route path='reels' element={<Reels />} /> */}

                <Route path='subscriptions'>
                  <Route index element={isExpert ? <Navigate to='/chats' replace /> : <Subscriptions />} />
                  <Route path='gold' element={isExpert ? <Navigate to='/chats' replace /> : <GoldSubscription />} />
                  <Route path='silver' element={isExpert ? <Navigate to='/chats' replace /> : <SilverSubscription />} />
                  <Route path='platinum' element={isExpert ? <Navigate to='/chats' replace /> : <PlatinumSubscription />} />
                </Route>

                <Route path='wardrobe' element={<WardrobeHub />} />
                <Route path='wardrobe/style-profile' element={<StyleProfile />} />
                <Route path='wardrobe/my-closet' element={<MyCloset />} />
                <Route path='wardrobe/suggest' element={<SuggestHub />} />
                <Route path='wardrobe/suggest/full-outfit' element={<FullOutfit />} />
                <Route path='wardrobe/suggest/from-item' element={<FromItem />} />
                <Route path='wardrobe/pairings' element={<Pairings />} />
                <Route path='wardrobe/outfit-builder' element={<OutfitBuilder />} />
                <Route path='wardrobe/outfits' element={<OutfitList />} />
                <Route path='wardrobe/outfits/:outfitId' element={<OutfitDetail />} />
                <Route path='wardrobe/outfit-log' element={<WearLogPage />} />
                <Route path='wardrobe/shop' element={<ShopPage />} />
                <Route path='become-expert' element={isExpert ? <Navigate to='/chats' replace /> : <BecomeExpert />} />
                <Route path='expert-profile' element={isExpert ? <ExpertProfileEdit /> : <Navigate to='/chats' replace />} />

                {/* Admin module — nested under Home layout, protected by AdminLoginGate inside AdminLayout */}
                <Route path='admin' element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path='users' element={<UserList />} />
                  <Route path='users/:userId' element={<UserDetail />} />
                  <Route path='experts' element={<ExpertList />} />
                  <Route path='experts/applications/:applicationId' element={<ExpertApplicationDetail />} />
                  <Route path='subscriptions' element={<SubscriptionList />} />
                  <Route path='subscriptions/:subscriptionId' element={<SubscriptionDetail />} />
                  <Route path='feedback' element={<FeedbackList />} />
                  <Route path='feedback/:bugId' element={<BugDetail />} />
                  <Route path='complaints' element={<ComplaintList />} />
                  <Route path='complaints/:complaintId' element={<ComplaintDetail />} />
                  <Route path='notifications' element={<NotificationList />} />
                  <Route path='sessions' element={<SessionList />} />
                  <Route path='wardrobe' element={<WardrobeAnalytics />} />
                  <Route path='team' element={<AdminTeam />} />
                </Route>

                <Route path='/notifications' element={<NotificationPanel />} />
                <Route path='/profile' element={<UserProfile />}>
                  <Route index element={<Navigate to='history' />} />
                  {/* <Route path='posts' element={<Posts />} /> */}
                  {/* <Route path='likes' element={<Likes />} /> */}
                  <Route path='history' element={<UserHistory />} />
                  <Route path='settings' element={<UserSettings />}>
                    <Route index element={<Navigate to='overview' />} />
                    <Route path='overview' element={<UserSettings />} />
                    <Route path='account' element={<AccountSettings />} />
                    <Route path='theme' element={<ThemeSettings />} />
                    <Route
                      path='notifications'
                      element={<NotificationSettings />}
                    />
                    <Route path='privacy' element={<PrivacySettings />} />
                    <Route path='preferences' element={<PreferenceSettings />} />
                    <Route path='layout' element={<LayoutSettings />} />
                    <Route
                      path='accessibility'
                      element={<AccessibilitySettings />}
                    />
                    <Route path='sessions' element={<SessionSettings />} />
                    <Route path='usage' element={<UsageSettings />} />
                    <Route path='reels' element={<ReelsSettings />} />
                    <Route path='analytics' element={<AnalyticsSettings />} />
                  </Route>
                </Route>
              </Route>

              <Route
                path='/login'
                element={!userId ? (
                  <Suspense fallback={<LoginLoader />}>
                    <div className="flex items-center justify-center min-h-screen">
                      <Login />
                    </div>
                  </Suspense>
                ) : <Navigate to='/' />}
              />
              <Route
                path='/complete-profile'
                element={
                  userId && isAlreadyVerified === false ? (
                    <Suspense fallback={<LoginLoader />}>
                      <div className="flex items-center justify-center min-h-screen">
                        <UserInfoForm />
                      </div>
                    </Suspense>
                  ) : (
                    <Navigate to='/' />
                  )
                }
              />
              <Route path='/outfit/:shareToken' element={<Suspense fallback={<PageLoader />}><SharedOutfitPage /></Suspense>} />
              <Route path='/terms' element={<Suspense fallback={<PageLoader />}><TermsAndConditions /></Suspense>} />
              <Route path='/privacy' element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
              <Route path='*' element={<Suspense fallback={<PageLoader />}><Missing /></Suspense>} />
            </Routes>
            </Suspense>
          </div>
          <Feedback />
          {/* Global video call overlays — rendered above all routes */}
          <VideoCall />
          <IncomingCall />
          <ExpertPermissionRequest />
          <ExpertPermissionStatus />
          <CallErrorModal />
        </Router>
        </NotificationProvider>
        </VideoCallProvider>
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
