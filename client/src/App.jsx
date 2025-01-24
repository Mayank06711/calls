import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { decrementTimer } from "./redux/actions/login.actions";
import { setUserId, setUserInfo } from "./redux/actions/auth.actions";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import backgroundImage from "./assets/loginBackground.jpg";
import Login from "./Components/login/Login";
import Home from "./Components/Home/Home";
import Missing from "./Components/Missing";
import Toast from "./Components/Notification/Toast";
import { createTheme, ThemeProvider } from "@mui/material";
import UserInfoForm from "./Components/Login/UserInfoForm";

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
    isTimerActive
  } = useSelector(state => state.auth);

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
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.05,
            zIndex: 0,
          }}
        />
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                userId ? (
                  !isAlreadyVerified && otpVerified? (
                    <Navigate to="/complete-profile" />
                  ) : (
                    <Home />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
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
