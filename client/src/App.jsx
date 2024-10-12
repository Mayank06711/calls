import Home from "./Components/Home";
import Login from "./Components/Login";
import Missing from "./Components/Missing";
import backgroundImage from "./assets/loginBackground.jpg";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { setToken } from "./redux/actions";

const App = () => {
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  console.log("token", token);
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      dispatch(setToken(savedToken));
    }
  }, [dispatch]);

  return (
    <div className='relative flex justify-center items-center h-[100vh]'>
      <div
        className='absolute inset-0'
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
            path='/'
            element={token ? <Home /> : <Navigate to='/login' />}
          />
          <Route
            path='/login'
            element={!token ? <Login /> : <Navigate to='/' />}
          />

           {/* Define a "catch-all" route for undefined paths */}
          <Route path="*" element={<Missing />} />
        </Routes>
      </Router>
    </div>
  );
};

export default App;
