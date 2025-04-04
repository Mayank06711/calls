import React from 'react';
import { NotificationsOutlined } from '@mui/icons-material';
import SettingTemplate from '../SettingTemplate';

function NotificationSettings() {
  return (
    <SettingTemplate title="Notification Settings" icon={<NotificationsOutlined />}>
      <div>
        <h2 className="text-lg font-medium mb-4">Manage Your Alerts</h2>
        <p>Notification settings content goes here...</p>
        {/* Add your notification settings controls here */}
      </div>
    </SettingTemplate>
  );
}

export default NotificationSettings;