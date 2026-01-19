import React from 'react';
import { LockOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function PrivacySettings() {
  const colors = useSubscriptionColors();
  
  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px] 
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text cursor-pointer
    focus:outline-none`;
  
  const selectStyle = {
    borderColor: colors.fourth,
  };
  
  return (
    <SettingTemplate title="Privacy Settings" icon={<LockOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Control Your Account Privacy</h2>
        <p className="dark:text-gray-400 text-gray-600">Privacy settings content goes here...</p>
        {/* Add your privacy settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Profile Visibility</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Control who can see your profile</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>Everyone</option>
              <option>Friends Only</option>
              <option>Private</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Activity Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Show when you're active</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: 'var(--toggle-bg)' }}></div>
            </label>
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
        .peer:checked + div {
          background-color: ${colors.fourth} !important;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default PrivacySettings;