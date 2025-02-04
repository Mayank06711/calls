import React from "react";
import UserActivity from "./UserActivity/UserActivity";
import UserInfo from "./UserInfo";
import { Skeleton } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

function UserProfile() {

  const dispatch = useDispatch();
  const isLoading = useSelector((state) => state.auth.isProfileDataLoading);

  const UserInfoSkeleton = () => (
    <div className="flex flex-col bg-transparent w-[600px] rounded-md">
      <div className="w-full flex flex-col justify-center items-start p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20">
        <div className="flex justify-start items-center p-2 gap-4">
          <Skeleton variant="circular" width={150} height={150} />
          <div className="flex flex-col gap-2">
            <Skeleton variant="text" width={200} height={32} />
            <div className="flex gap-2">
              <Skeleton variant="rounded" width={60} height={20} />
              <Skeleton variant="rounded" width={60} height={20} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center m-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" width={100} height={24} />
          ))}
        </div>
      </div>

      <div className="flex-1 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm rounded-lg p-3">
              <div className="flex flex-col gap-1">
                <Skeleton variant="text" width={80} height={16} />
                <Skeleton variant="text" width={120} height={20} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const UserActivitySkeleton = () => (
    <div className="flex-1 flex flex-col p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" width={100} height={32} />
        ))}
      </div>
      <div className="flex-1">
        <Skeleton variant="rounded" height={400} />
      </div>
    </div>
  );

  return (
    <div className="flex w-full p-2 gap-2">
      {isLoading ? (
        <>
          <UserInfoSkeleton />
          <UserActivitySkeleton />
        </>
      ) : (
        <>
          <UserInfo />
          <UserActivity />
        </>
      )}
    </div>
  );
}

export default UserProfile;