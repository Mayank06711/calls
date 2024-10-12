/*
userId,
  email,
  token(cookie-token) {axios withcredentials:true}
  localToken (store where ever you want)
  refreshApi(github link has been sent to you how to implment this)
  loginurl = "https://localhost:5005/api/v1/users/login"
  signupUrl = "https://localhost:5005/api/v1/users/signup"
*/

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { userLoginThunk, userSignupThunk } from "../redux/thunks/login.thunks"; // Import thunks

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [isSignup, setIsSignup] = useState(true); // State to toggle between login/signup
  const dispatch = useDispatch();

  // Handle input change
  const handleChange = (e) => {
    console.log(e.target.value);
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      // Dispatch signup action
      dispatch(userSignupThunk(formData));
    } else {
      // Dispatch login action
      dispatch(userLoginThunk(formData));
    }
  };

  return (
    <div className='container z-10'>
      <div className='heading'>{isSignup ? "Sign Up" : "Login"}</div>
      <form className='form' onSubmit={handleSubmit}>
        {isSignup && (
          <input
            required
            className='input'
            type='text'
            name='username'
            id='username'
            placeholder='Username'
            value={formData.username}
            onChange={handleChange}
          />
        )}
        <input
          required
          className='input'
          type='email'
          name='email'
          id='email'
          placeholder='E-mail'
          value={formData.email}
          onChange={handleChange}
        />
        <input
          required
          className='input'
          type='password'
          name='password'
          id='password'
          placeholder='Password'
          value={formData.password}
          onChange={handleChange}
        />
        <span className='forgot-password'>
          <a href='#'>Forgot Password ?</a>
        </span>
        <input
          className='login-button'
          type='submit'
          value={isSignup ? "Sign Up" : "Sign In"}
        />
      </form>
      <div className='social-account-container'>
        <span className='title'>Or Sign in with</span>
        <div className='social-accounts'>
          <button className='social-button google'>
            <svg
              className='svg'
              xmlns='http://www.w3.org/2000/svg'
              height='1em'
              viewBox='0 0 488 512'
            >
              <path d='M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z'></path>
            </svg>
          </button>
        </div>
      </div>
      <span className='agreement'>
        <a href='#'>Learn user licence agreement</a>
      </span>
      <div>
        {isSignup ? (
          <p>
            Already have an account?{" "}
            <button onClick={() => setIsSignup(false)}>Login</button>
          </p>
        ) : (
          <p>
            Don not t have an account?{" "}
            <button onClick={() => setIsSignup(true)}>Sign Up</button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
