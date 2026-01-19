import React from 'react';
import { TimelineOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function UsageSettings() {
  const colors = useSubscriptionColors();
  
  return (
    <SettingTemplate title="Usage Tracking" icon={<TimelineOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Monitor Your Activity</h2>
        <p className="dark:text-gray-400 text-gray-600">Usage tracking content goes here...</p>
        {/* Add your usage tracking controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div>
              <h3 className="font-medium dark:text-dark-text text-light-text">Activity Tracking</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allow us to collect usage data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
          
          <div className="p-3 border rounded-lg dark:border-gray-700" style={{ borderColor: colors.fourth }}>
            <h3 className="font-medium mb-2 dark:text-dark-text text-light-text">Daily App Usage</h3>
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded relative">
              <div className="absolute bottom-0 left-0 w-1/4 h-1/3 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-1/4 w-1/4 h-2/3 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-2/4 w-1/4 h-1/2 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
              <div className="absolute bottom-0 left-3/4 w-1/4 h-1/4 rounded-t" style={{ backgroundColor: colors.fourth }}></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom styles for subscription-colored toggles */}
      <style>{`
        .peer:checked + div {
          background-color: ${colors.fourth} !important;
        }
      `}</style>
    </SettingTemplate>
  );
}

export default UsageSettings;