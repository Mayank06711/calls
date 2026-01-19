import React from 'react';
import { BarChartOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function AnalyticsSettings() {
  const colors = useSubscriptionColors();
  
  const selectClassName = `rounded-lg border px-3 py-2 min-w-[140px] 
    dark:bg-gray-700 dark:text-dark-text
    bg-white text-light-text cursor-pointer
    focus:outline-none`;
  
  const selectStyle = {
    borderColor: colors.fourth,
  };
  
  return (
    <SettingTemplate title="Analytics Settings" icon={<BarChartOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">View Your Statistics</h2>
        <p className="dark:text-gray-400 text-gray-600">Analytics settings content goes here...</p>
        {/* Add your analytics settings controls here */}
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Data Collection Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
                <div>
                  <p className="font-medium dark:text-dark-text text-light-text">Personal Analytics</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Collect data about your own usage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
                <div>
                  <p className="font-medium dark:text-dark-text text-light-text">Anonymous Feature Usage</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Share anonymous data to improve app</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Activity Overview</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Post Views</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">1,245</p>
                  <p className="text-xs" style={{ color: colors.fourth }}>+12% from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Engagement</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">38%</p>
                  <p className="text-xs text-red-500">-2% from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Messages</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">28</p>
                  <p className="text-xs" style={{ color: colors.fourth }}>+5 from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Active Time</h4>
                  <p className="text-2xl font-bold dark:text-dark-text text-light-text">3.5h</p>
                  <p className="text-xs text-gray-500">Similar to last week</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3 dark:text-dark-text text-light-text">Analytics Controls</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
                <div>
                  <p className="font-medium dark:text-dark-text text-light-text">Weekly Report</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive weekly analytics summary</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
                <div>
                  <p className="font-medium dark:text-dark-text text-light-text">Data Retention</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">How long to keep your analytics data</p>
                </div>
                <select className={selectClassName} style={selectStyle}>
                  <option>3 months</option>
                  <option>6 months</option>
                  <option>1 year</option>
                  <option>Forever</option>
                </select>
              </div>
              
              <button className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                Reset Analytics Data
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom styles for subscription-colored toggles and dropdowns */}
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

export default AnalyticsSettings;