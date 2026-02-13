import React from 'react';
import {
  Article,
  PhotoLibrary,
  People,
  Schedule,
  Construction,
  AutoAwesome
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../../../utils/getSubscriptionColors';

function Posts() {
  const colors = useSubscriptionColors();

  const SkeletonCard = ({ icon: Icon, title, items }) => (
    <div
      className="p-4 rounded-xl border-2 border-dashed"
      style={{ borderColor: toRgba(colors.fourth, 0.4) }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: toRgba(colors.fourth, 0.2) }}
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
              background: `linear-gradient(90deg, ${toRgba(colors.fourth, (15 - i * 3) / 100)}, ${toRgba(colors.fourth, 0.05)})`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: toRgba(colors.fourth, 0.3) }}
            />
            <span className="text-sm opacity-60 dark:text-gray-400 text-gray-500">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.3)}, ${toRgba(colors.fourth, 0.1)})`,
            border: `2px solid ${toRgba(colors.fourth, 0.5)}`
          }}
        >
          <Article className="text-4xl" style={{ color: colors.fourth }} />
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
          Your Posts
        </h1>

        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Share your thoughts, images, and stories with the community.
        </p>

        <div
          className="flex items-center justify-center gap-2 py-2 px-4 rounded-full w-fit mx-auto mt-4"
          style={{
            backgroundColor: toRgba(colors.fourth, 0.15),
            border: `1px solid ${toRgba(colors.fourth, 0.4)}`
          }}
        >
          <Construction className="text-sm animate-bounce" style={{ color: colors.fourth }} />
          <span className="text-sm font-medium" style={{ color: colors.fourth }}>
            Coming Soon
          </span>
          <AutoAwesome className="text-sm" style={{ color: colors.fourth }} />
        </div>
      </div>

      {/* Post Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">

        <SkeletonCard
          icon={Article}
          title="Text Posts"
          items={['Write Stories', 'Add Captions', 'Rich Text Editor', 'Save Drafts']}
        />

        <SkeletonCard
          icon={PhotoLibrary}
          title="Media Gallery"
          items={['Photo Upload', 'Video Upload', 'Album Creation', 'Filters & Effects']}
        />

        <SkeletonCard
          icon={People}
          title="Social Features"
          items={['Tag Friends', 'Location Tags', 'Mentions', 'Hashtags']}
        />

        <SkeletonCard
          icon={Schedule}
          title="Publishing"
          items={['Schedule Posts', 'Auto-Publish', 'Cross-Post', 'Post Analytics']}
        />
      </div>

      {/* Features Preview */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold mb-3 dark:text-gray-300 text-gray-700 text-center">
          What you'll be able to do:
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Create Posts',
            'Add Media',
            'Tag Friends',
            'Location Tags',
            'Schedule Posts',
            'Post Analytics',
            'Rich Editor',
            'Save Drafts'
          ].map((feature, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: toRgba(colors.fourth, 0.15),
                color: colors.fourth,
                border: `1px solid ${toRgba(colors.fourth, 0.3)}`
              }}
            >
              {feature}
            </span>
          ))}
        </div>
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

export default Posts;
