import React from "react";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import ErrorMessage from "./ErrorMessage";
import { useSelector } from "react-redux";

const SubscriptionSkeleton = () => {
  const subscriptionPlans = useSelector((state) => state.plans);
  const plans = subscriptionPlans.plans;
  const loaders = useSelector((state) => state.loaderState.loaders);
  const headerCount = 4; // Number of plan columns
  const rowCount = 11; // Number of feature rows

  return (
    <div className="animate-pulse">
      {/* Table Skeleton */}
      {loaders[LOADER_TYPES.SUBSCRIPTION_GET_PLANS]?
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl 
          border-separate border-spacing-[3px]
          bg-light-secondary/20 dark:bg-dark-secondary/20"
        >
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-[3px]">
            {/* Features Column Header */}
            <div
              className="h-24 bg-slate-200 dark:bg-slate-700 rounded-tl-xl 
            animate-shimmer"
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-light-secondary/10 dark:via-dark-secondary/10 to-transparent" />
            </div>

            {/* Plan Column Headers */}
            {[...Array(headerCount)].map((_, index) => (
              <div
                key={index}
                className={`h-24 bg-slate-200 dark:bg-slate-700 
                ${index === headerCount - 1 ? "rounded-tr-xl" : ""} 
                overflow-hidden animate-shimmer`}
              >
                <div className="h-full flex flex-col gap-2 justify-center items-center p-3">
                  <div className="w-3/4 h-4 bg-light-secondary/20 dark:bg-dark-secondary/30 rounded" />
                  <div className="w-1/2 h-6 bg-light-secondary/20 dark:bg-dark-secondary/30 rounded" />
                  <div className="w-1/3 h-3 bg-light-secondary/20 dark:bg-dark-secondary/30 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Table Body */}
          {[...Array(rowCount)].map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-5 gap-[3px] mt-[3px]">
              {/* Feature Name Cell */}
              <div className="h-12 bg-light-primary dark:bg-dark-primary p-3 animate-shimmer">
                <div className="w-3/4 h-4 bg-light-secondary/20 dark:bg-dark-secondary/30 rounded" />
              </div>

              {/* Feature Values Cells */}
              {[...Array(headerCount)].map((_, colIndex) => (
                <div
                  key={colIndex}
                  className="h-12 bg-light-primary dark:bg-dark-primary flex justify-center items-center animate-shimmer"
                >
                  <div className="w-6 h-6 rounded-full bg-light-secondary/20 dark:bg-dark-secondary/30" />
                </div>
              ))}
            </div>
          ))}

          {/* Table Footer */}
          <div className="grid grid-cols-5 gap-[3px] mt-[3px]">
            <div className="h-16 bg-light-primary dark:bg-dark-primary rounded-bl-xl" />
            {[...Array(headerCount)].map((_, index) => (
              <div
                key={index}
                className={`h-16 bg-light-primary dark:bg-dark-primary 
                ${index === headerCount - 1 ? "rounded-br-xl" : ""} 
                p-3 animate-shimmer`}
              >
                <div className="w-full h-8 bg-light-secondary/20 dark:bg-dark-secondary/30 rounded" />
              </div>
            ))}
          </div>
        </div>:
        <ErrorMessage/>
      }
    </div>
  );
};

export default SubscriptionSkeleton;
