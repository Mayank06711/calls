import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function SettingTemplate({ title, icon, children }) {
  const navigate = useNavigate();
  
  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/profile/settings')}
          className="p-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowBackIcon />
        </button>
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        {children}
      </div>
    </div>
  );
}

export default SettingTemplate;