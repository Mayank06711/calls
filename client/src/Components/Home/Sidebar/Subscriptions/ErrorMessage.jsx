import React from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getSubscriptionPlansThunk } from '../../../../redux/thunks/subscription.thunks';

const ErrorMessage = () => {
    const handleRetryClick=() => {
        getSubscriptionPlansThunk();
    }
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-1">
      {/* Animated Error Icon */}
      <div className="animate-bounce-slow mb-6">
        <ErrorOutlineIcon 
          className="text-red-500 dark:text-red-400"
          sx={{ fontSize: '64px' }}
        />
      </div>

      {/* Animated Text Container */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-light-text dark:text-dark-text
          animate-fade-in-up">
          Something went wrong
        </h2>
        
        {/* Animated Dots */}
        <div className="flex justify-center gap-1 mb-4">
          <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse-dot-1"></span>
          <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse-dot-2"></span>
          <span className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full animate-pulse-dot-3"></span>
        </div>

        <p className="text-light-text/70 dark:text-dark-text/70 text-lg
          animate-fade-in-up animation-delay-200">
          Please try again after some time
        </p>

        {/* Optional: Retry Button */}
        <button 
          className="mt-6 px-6 py-2 bg-red-500 dark:bg-red-400 text-white rounded-lg
            hover:bg-red-600 dark:hover:bg-red-500 transition-all duration-300
            animate-fade-in-up animation-delay-400
            hover:scale-105 active:scale-95"
          onClick={handleRetryClick}
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default ErrorMessage;