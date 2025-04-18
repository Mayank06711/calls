import React from 'react';
import { BarChartOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function AnalyticsSettings() {
  return (
    <SettingTemplate title="Analytics Settings" icon={<BarChartOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">View Your Statistics</h2>
        <p>Analytics settings content goes here...</p>
        {/* Add your analytics settings controls here */}
        <div className="mt-4 space-y-6">
          <div>
            <h3 className="font-medium mb-3">Data Collection Preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Personal Analytics</p>
                  <p className="text-sm text-gray-500">Collect data about your own usage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Anonymous Feature Usage</p>
                  <p className="text-sm text-gray-500">Share anonymous data to improve app</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Activity Overview</h3>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Post Views</h4>
                  <p className="text-2xl font-bold">1,245</p>
                  <p className="text-xs text-green-500">+12% from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Engagement</h4>
                  <p className="text-2xl font-bold">38%</p>
                  <p className="text-xs text-red-500">-2% from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Messages</h4>
                  <p className="text-2xl font-bold">28</p>
                  <p className="text-xs text-green-500">+5 from last week</p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                  <h4 className="text-sm font-medium text-gray-500">Active Time</h4>
                  <p className="text-2xl font-bold">3.5h</p>
                  <p className="text-xs text-gray-500">Similar to last week</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Analytics Controls</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Report</p>
                  <p className="text-sm text-gray-500">Receive weekly analytics summary</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Data Retention</p>
                  <p className="text-sm text-gray-500">How long to keep your analytics data</p>
                </div>
                <select className="rounded border px-2 py-1">
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
    </SettingTemplate>
  );
}

export default AnalyticsSettings;