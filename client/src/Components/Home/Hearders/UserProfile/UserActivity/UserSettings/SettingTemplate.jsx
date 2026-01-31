import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSubscriptionColors } from '../../../../../../utils/getSubscriptionColors';

function SettingTemplate({ title, icon, children }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const colors = useSubscriptionColors();
  
  // Scroll to top when component mounts
  useEffect(() => {
    // Scroll the container to top
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    // Also scroll window to top
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div ref={containerRef} className="p-2 sm:p-4">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/profile/settings')}
          className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors dark:text-dark-text text-light-text"
        >
          <ArrowBackIcon />
        </button>
        <div className="flex items-center dark:text-dark-text text-light-text">
          {icon && <span className="mr-2" style={{ color: colors.fourth }}>{icon}</span>}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </div>
      
      <div className="bg-white/5 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 shadow border border-white/10 dark:border-gray-700">
        {children}
      </div>
    </div>
  );
}

export default SettingTemplate;