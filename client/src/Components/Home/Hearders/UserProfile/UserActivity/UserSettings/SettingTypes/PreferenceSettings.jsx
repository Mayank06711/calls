import React from 'react';
import { TuneOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function PreferenceSettings() {
  return (
    <SettingTemplate title="Preference Settings" icon={<TuneOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">Set Your App Preferences</h2>
        <p>Preference settings content goes here...</p>
        {/* Add your preference settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Language</h3>
              <p className="text-sm text-gray-500">Choose your preferred language</p>
            </div>
            <select className="rounded border px-2 py-1">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>German</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Time Format</h3>
              <p className="text-sm text-gray-500">12-hour or 24-hour clock</p>
            </div>
            <select className="rounded border px-2 py-1">
              <option>12-hour</option>
              <option>24-hour</option>
            </select>
          </div>
        </div>
      </div>
    </SettingTemplate>
  );
}

export default PreferenceSettings;