import React from 'react';
import { TuneOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function PreferenceSettings() {
  const colors = useSubscriptionColors();
  
  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px] 
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text cursor-pointer
    focus:outline-none`;
  
  const selectStyle = {
    borderColor: colors.fourth,
  };
  
  return (
    <SettingTemplate title="Preference Settings" icon={<TuneOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Set Your App Preferences</h2>
        <p className="dark:text-gray-400 text-gray-600">Preference settings content goes here...</p>
        {/* Add your preference settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Language</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred language</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Time Format</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">12-hour or 24-hour clock</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>12-hour</option>
              <option>24-hour</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Custom styles for subscription-colored focus ring and dropdown */}
      <style>{`
        select:focus {
          box-shadow: 0 0 0 2px ${colors.fourth};
        }
        select option:checked,
        select option:hover {
          background: linear-gradient(${colors.fourth}, ${colors.fourth});
          color: white;
        }
        select option {
          background: #374151;
          color: white;
          padding: 8px;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default PreferenceSettings;