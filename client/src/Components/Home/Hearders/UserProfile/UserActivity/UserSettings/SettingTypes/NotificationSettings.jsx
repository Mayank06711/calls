import React from 'react';
import { NotificationsOutlined, Email, Message, Campaign, VolumeUp } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';
import { useSubscriptionColors } from '../../../../../../../utils/getSubscriptionColors';

function NotificationSettings() {
  const colors = useSubscriptionColors();
  
  return (
    <SettingTemplate title="Notification Settings" icon={<NotificationsOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4 dark:text-dark-text text-light-text">Manage Your Alerts</h2>
        <p className="dark:text-gray-400 text-gray-600 mb-4">Choose what notifications you want to receive</p>
        
        <div className="space-y-4">
          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <NotificationsOutlined style={{ color: colors.fourth }} />
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Push Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications on this device</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Email style={{ color: colors.fourth }} />
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Email Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive important updates via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Message Notifications */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Message style={{ color: colors.fourth }} />
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Message Alerts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified for new messages</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Campaign style={{ color: colors.fourth }} />
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Marketing</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive offers and promotions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <VolumeUp style={{ color: colors.fourth }} />
              <div>
                <h3 className="font-medium dark:text-dark-text text-light-text">Sound</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Play sounds for notifications</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
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

export default NotificationSettings;