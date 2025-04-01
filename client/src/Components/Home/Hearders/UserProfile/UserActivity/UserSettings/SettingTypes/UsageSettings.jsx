import React from 'react';
import { TimelineOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function UsageSettings() {
  return (
    <SettingTemplate title="Usage Tracking" icon={<TimelineOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">Monitor Your Activity</h2>
        <p>Usage tracking content goes here...</p>
        {/* Add your usage tracking controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Activity Tracking</h3>
              <p className="text-sm text-gray-500">Allow us to collect usage data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          
          <div className="p-3 border rounded-lg">
            <h3 className="font-medium mb-2">Daily App Usage</h3>
            <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded relative">
              <div className="absolute bottom-0 left-0 w-1/4 h-1/3 bg-green-500"></div>
              <div className="absolute bottom-0 left-1/4 w-1/4 h-2/3 bg-green-500"></div>
              <div className="absolute bottom-0 left-2/4 w-1/4 h-1/2 bg-green-500"></div>
              <div className="absolute bottom-0 left-3/4 w-1/4 h-1/4 bg-green-500"></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
            </div>
          </div>
        </div>
      </div>
    </SettingTemplate>
  );
}

export default UsageSettings;