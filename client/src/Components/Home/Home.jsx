import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserInfoThunk } from "../../redux/thunks/userInfo.thunks";

function Home() {
  const dispatch = useDispatch();
  const {
    data: userInfo,
    loading,
    error,
  } = useSelector((state) => state.userInfo);

  useEffect(() => {
    dispatch(fetchUserInfoThunk());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-red-500">
          Error loading user information: {error}
        </div>
      </div>
    );
  }
 
  return (
    <div className="p-8 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-green-600 mb-6">
        Welcome, {userInfo?.fullName}! 👋
      </h1>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Username</p>
            <p className="font-semibold">{userInfo?.username}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Email</p>
            <p className="font-semibold">{userInfo?.email || "Not provided"}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Phone</p>
            <p className="font-semibold">{userInfo?.phoneNumber}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Gender</p>
            <p className="font-semibold">{userInfo?.gender}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Age</p>
            <p className="font-semibold">{userInfo?.age} years</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600">Location</p>
            <p className="font-semibold">
              {userInfo?.city}, {userInfo?.country}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <div className="bg-green-50 px-4 py-2 rounded-full">
            <span className="text-green-600">
              {userInfo?.isPhoneVerified
                ? "✓ Phone Verified"
                : "✗ Phone Not Verified"}
            </span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-full">
            <span className="text-blue-600">
              {userInfo?.isEmailVerified
                ? "✓ Email Verified"
                : "✗ Email Not Verified"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
