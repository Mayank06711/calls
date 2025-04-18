import React from 'react';
import { LockOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function PrivacySettings() {
  return (
    <SettingTemplate title="Privacy Settings" icon={<LockOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">Control Your Account Privacy</h2>
        <p>Privacy settings content goes here...</p>
        {/* Add your privacy settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Profile Visibility</h3>
              <p className="text-sm text-gray-500">Control who can see your profile</p>
            </div>
            <select className="rounded border px-2 py-1">
              <option>Everyone</option>
              <option>Friends Only</option>
              <option>Private</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Activity Status</h3>
              <p className="text-sm text-gray-500">Show when you're active</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>
    </SettingTemplate>
  );
}

export default PrivacySettings;