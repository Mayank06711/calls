import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { decrementTimer } from "./redux/actions/login.actions";
import { setUserId, setUserInfo } from "./redux/actions/auth.actions";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./Components/Login/Login";
import Home from "./Components/Home/Home";
import Missing from "./Components/Missing";
import Toast from "./Components/Notification/Toast";
import { createTheme, ThemeProvider } from "@mui/material";
import UserInfoForm from "./Components/Login/UserInfoForm";
import Chats from "./Components/Home/Sidebar/Chats/Chats";
import Reels from "./Components/Home/Sidebar/Reels/Reels";
import Subscriptions from "./Components/Home/Sidebar/Subscriptions/Subscriptions";
import Settings from "./Components/Home/Sidebar/Settings/Settings";
import UserProfile from "./Components/Home/Hearders/UserProfile/UserProfile";
import NotificationPanel from "./Components/Home/Hearders/Notifications/NotificationPanel";
import UserSettings from "./Components/Home/Hearders/UserProfile/UserActivity/UserSettings/UserSettings";
import MyStyle from "./Components/Home/Hearders/UserProfile/UserActivity/MyStyle/MyStyle";
import UserHistory from "./Components/Home/Hearders/UserProfile/UserActivity/UserHistory/UserHistory";
import Likes from "./Components/Home/Hearders/UserProfile/UserActivity/Likes/Likes";
import Posts from "./Components/Home/Hearders/UserProfile/UserActivity/Posts/Posts";
import CasualSubscription from "./Components/Home/Sidebar/Subscriptions/SubscriptionType/GoldSubscription";
import SilverSubscription from "./Components/Home/Sidebar/Subscriptions/SubscriptionType/SilverSubscription";
import PlatinumSubscription from "./Components/Home/Sidebar/Subscriptions/SubscriptionType/PlatinumSubscription";
import GoldSubscription from "./Components/Home/Sidebar/Subscriptions/SubscriptionType/GoldSubscription";

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
  const userId = useSelector((state) => state.auth.userId);
  const dispatch = useDispatch();
  const {
    otpGenerated,
    otpVerified,
    isAlreadyVerified,
    otpVerificationInProgress,
    timer,
    isTimerActive,
  } = useSelector((state) => state.auth);

  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    const savedUserInfo = localStorage.getItem("userInfo");

    if (savedUserId) {
      dispatch(setUserId(savedUserId));
    }
    if (savedUserInfo) {
      dispatch(setUserInfo(JSON.parse(savedUserInfo)));
    }
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

  return (
    <ThemeProvider theme={theme}>
      <div className="relative flex justify-center items-center h-[100vh]">
        <Toast />
        {/* <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.05,
            zIndex: 0,
          }}
        /> */}
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                userId ? (
                  !isAlreadyVerified && otpVerified ? (
                    <Navigate to="/complete-profile" />
                  ) : (
                    <Home />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              {/* Nested routes for main content area */}
              <Route path="/chats" element={<Chats />} />
              <Route path="/reels" element={<Reels />} />
              
              <Route path="subscriptions">
                <Route index element={<Subscriptions />} />
                <Route path="gold" element={<GoldSubscription />} />
                <Route path="silver" element={<SilverSubscription />} />
                <Route path="platinum" element={<PlatinumSubscription />} />
              </Route>

              <Route path="/settings" element={<Settings />} />
              <Route path="/notifications" element={<NotificationPanel />} />
              <Route path="/profile" element={<UserProfile />}>
                <Route index element={<Navigate to="posts" />} />
                <Route path="posts" element={<Posts />} />
                <Route path="likes" element={<Likes />} />
                <Route path="history" element={<UserHistory />} />
                <Route path="my-style" element={<MyStyle />} />
                <Route path="settings" element={<UserSettings />} />
              </Route>
            </Route>

            <Route
              path="/login"
              element={!userId ? <Login /> : <Navigate to="/" />}
            />
            <Route
              path="/complete-profile"
              element={
                userId && isAlreadyVerified === false ? (
                  <UserInfoForm />
                ) : (
                  <Navigate to="/" />
                )
              }
            />
            <Route path="*" element={<Missing />} />
          </Routes>
        </Router>
      </div>
    </ThemeProvider>
  );
};

export default App;
