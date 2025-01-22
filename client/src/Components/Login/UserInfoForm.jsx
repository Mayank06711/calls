import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUserInfoThunk } from "../../redux/thunks/login.thunks";
import { useNavigate } from "react-router-dom";
import { showNotification } from "../../redux/actions";
import { fetchUserInfoThunk } from "../../redux/thunks/userInfo.thunks";

function UserInfoForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userId = useSelector((state) => state.auth.userId);
  const [formData, setFormData] = useState({
    fullName: "",
    gender: "",
    dob: "",
    city: "India",
    country: "India",
    email: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = dispatch(updateUserInfoThunk(formData));
      if (response?.parsedBody?.success) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error updating user info:", error);
    }
  };

  const handleSkip = () => {
    if (userId) {
      dispatch(fetchUserInfoThunk());
      navigate("/");
    } else {
      dispatch(showNotification("User ID not found", 400));
    }
  };

  // Calculate max date (14 years ago from today)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 14);
  const maxDateString = maxDate.toISOString().split("T")[0];

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto bg-transparent rounded-lg animate__animated animate__fadeIn">
      <h2 className="text-2xl font-bold text-[#059212] mb-6">
        Complete Your Profile
      </h2>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500 
            transition-all duration-300 ease-in-out
            placeholder:text-gray-400"
        />

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Not to say">Prefer not to say</option>
        </select>

        <input
          type="date"
          name="dob"
          max={maxDateString}
          value={formData.dob}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500"
        />

        <input
          type="text"
          name="city"
          placeholder="City (Optional)"
          value={formData.city}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500 
            placeholder:text-gray-400"
        />

        <input
          type="text"
          name="country"
          placeholder="Country (Optional)"
          value={formData.country}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500 
            placeholder:text-gray-400"
        />

        <input
          type="email"
          name="email"
          placeholder="Email (Optional)"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
            border-b-2 outline-none text-[#059212] 
            focus:border-b-green-500 
            placeholder:text-gray-400"
        />

        <div className="flex gap-4 justify-center pt-4">
          <button
            type="submit"
            className="px-8 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="px-8 py-2 text-green-500 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}

export default UserInfoForm;

