import React from 'react';
import { Favorite } from '@mui/icons-material';
import ComingSoon from '../../../../../Common/ComingSoon';

function Likes() {
  return (
    <ComingSoon 
      title="Your Likes"
      subtitle="All the posts and content you've loved will appear here."
      type="likes"
      icon={<Favorite className="text-4xl" />}
      features={['Liked Posts', 'Liked Reels', 'Liked Comments', 'Collections']}
    />
  );
}

export default Likes;
