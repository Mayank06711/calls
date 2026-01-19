import React from 'react';
import { Article } from '@mui/icons-material';
import ComingSoon from '../../../../../Common/ComingSoon';

function Posts() {
  return (
    <ComingSoon 
      title="Your Posts"
      subtitle="Share your thoughts, images, and stories with the community."
      type="posts"
      icon={<Article className="text-4xl" />}
      features={['Create Posts', 'Add Media', 'Tag Friends', 'Location Tags', 'Schedule Posts']}
    />
  );
}

export default Posts;
