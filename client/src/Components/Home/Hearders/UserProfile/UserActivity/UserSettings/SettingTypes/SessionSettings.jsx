import React from 'react';
import { AccessTimeOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function SessionSettings() {
  return (
    <SettingTemplate title="Session Information" icon={<AccessTimeOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">View Active Sessions</h2>
        <p>Session information content goes here...</p>
        {/* Add your session settings controls here */}
        <div className="mt-4">
          <h3 className="font-medium mb-3">Active Sessions</h3>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Chrome on Windows</p>
                  <p className="text-sm text-gray-500">Last active: Today at 2:45 PM</p>
                  <p className="text-sm text-gray-500">IP: 192.168.1.1</p>
                </div>
                <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                  Logout
                </button>
              </div>
            </div>
            
            <div className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">Safari on iPhone</p>
                  <p className="text-sm text-gray-500">Last active: Yesterday at 7:30 PM</p>
                  <p className="text-sm text-gray-500">IP: 192.168.1.2</p>
                </div>
                <button className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingTemplate>
  );
}

export default SessionSettings;