import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setToken, decrementTimer } from "./redux/actions";
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
  const token = useSelector((state) => state.auth.token);
  const timer = useSelector((state) => state.auth.otpTimer);
  const isTimerActive = useSelector((state) => state.auth.isTimerActive);
  const dispatch = useDispatch();

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      dispatch(setToken(savedToken));
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
            element={token ? <Home /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!token ? <Login /> : <Navigate to="/" />}
          />
          <Route path="*" element={<Missing />} />
        </Routes>
      </Router>
    </div>
    </ThemeProvider>
  );
};

export default App;
