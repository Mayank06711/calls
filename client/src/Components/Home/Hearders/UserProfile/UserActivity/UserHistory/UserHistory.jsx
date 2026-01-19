import React from 'react';
import { History } from '@mui/icons-material';
import ComingSoon from '../../../../../Common/ComingSoon';

function UserHistory() {
  return (
    <ComingSoon 
      title="Activity History"
      subtitle="Track your journey and see all your past activities."
      type="history"
      icon={<History className="text-4xl" />}
      features={['View History', 'Watch History', 'Search History', 'Clear History']}
    />
  );
}

export default UserHistory;
