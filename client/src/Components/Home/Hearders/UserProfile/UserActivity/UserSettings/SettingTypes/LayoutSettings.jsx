import React from 'react';
import { ViewQuiltOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function LayoutSettings() {
  const colors = useSubscriptionColors();
  
  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px] 
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text cursor-pointer
    focus:outline-none`;
  
  const selectStyle = {
    borderColor: colors.fourth,
  };
  
  return (
    <SettingTemplate title="Layout Settings" icon={<ViewQuiltOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Customize Your View</h2>
        <p className="dark:text-gray-400 text-gray-600">Layout settings content goes here...</p>
        {/* Add your layout settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Sidebar Position</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Position of the sidebar</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>Left</option>
              <option>Right</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Density</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Content density of the interface</p>
            </div>
            <select className={selectClassName} style={selectStyle}>
              <option>Comfortable</option>
              <option>Compact</option>
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

export default LayoutSettings;