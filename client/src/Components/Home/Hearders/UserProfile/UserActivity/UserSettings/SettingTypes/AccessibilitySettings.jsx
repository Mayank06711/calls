import React from 'react';
import { AccessibilityNewOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function AccessibilitySettings() {
  return (
    <SettingTemplate title="Accessibility Settings" icon={<AccessibilityNewOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">Adjust Accessibility Options</h2>
        <p>Accessibility settings content goes here...</p>
        {/* Add your accessibility settings controls here */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Font Size</h3>
              <p className="text-sm text-gray-500">Adjust the text size</p>
            </div>
            <select className="rounded border px-2 py-1">
              <option>Small</option>
              <option>Medium</option>
              <option>Large</option>
              <option>Extra Large</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Screen Reader Support</h3>
              <p className="text-sm text-gray-500">Enable enhanced screen reader support</p>
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

export default AccessibilitySettings;