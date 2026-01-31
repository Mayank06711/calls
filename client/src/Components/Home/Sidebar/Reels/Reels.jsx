import React from 'react';
import {
  VideoLibrary,
  PlayCircleOutline,
  Explore,
  TrendingUp,
  Construction,
  AutoAwesome
} from '@mui/icons-material';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

function Reels() {
  const colors = useSubscriptionColors();

  const SkeletonCard = ({ icon: Icon, title, items }) => (
    <div
      className="p-4 rounded-xl border-2 border-dashed"
      style={{ borderColor: `${colors.fourth}40` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${colors.fourth}20` }}
        >
          <Icon style={{ color: colors.fourth }} />
        </div>
        <h3 className="font-semibold dark:text-dark-text text-light-text">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="h-8 rounded-lg animate-pulse flex items-center px-3 gap-2"
            style={{
              background: `linear-gradient(90deg, ${colors.fourth}${15 - i * 3}, ${colors.fourth}05)`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: `${colors.fourth}30` }}
            />
            <span className="text-sm opacity-60 dark:text-gray-400 text-gray-500">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-start h-full p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: `linear-gradient(135deg, ${colors.fourth}30, ${colors.fourth}10)`,
            border: `2px solid ${colors.fourth}50`
          }}
        >
          <VideoLibrary className="text-4xl" style={{ color: colors.fourth }} />
        </div>

        <h1
          className="text-2xl md:text-3xl font-bold mb-2"
          style={{
            background: `linear-gradient(90deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Reels
        </h1>

        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Short videos, stories, and highlights from the community.
        </p>

        <div
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-full w-fit mx-auto mt-4"
          style={{
            backgroundColor: `${colors.fourth}15`,
            border: `1px solid ${colors.fourth}40`
          }}
        >
          <Construction className="text-sm animate-bounce" style={{ color: colors.fourth }} />
          <span className="text-sm font-medium" style={{ color: colors.fourth }}>
            Coming Soon
          </span>
          <AutoAwesome className="text-sm" style={{ color: colors.fourth }} />
        </div>
      </div>

      {/* Feature Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        <SkeletonCard
          icon={PlayCircleOutline}
          title="Video Reels"
          items={['Record & Upload', 'Add Music', 'Filters & Effects', 'Trim & Edit']}
        />

        <SkeletonCard
          icon={Explore}
          title="Discover"
          items={['Trending Reels', 'Expert Highlights', 'Browse Categories', 'Recommendations']}
        />

        <SkeletonCard
          icon={TrendingUp}
          title="Engagement"
          items={['Likes & Views', 'Share Reels', 'Save Favorites', 'Follow Creators']}
        />

        <SkeletonCard
          icon={VideoLibrary}
          title="Your Library"
          items={['My Reels', 'Saved Reels', 'Watch History', 'Drafts']}
        />
      </div>

      {/* Animated dots */}
      <div className="flex justify-center gap-1 mt-8">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: colors.fourth,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default Reels;
