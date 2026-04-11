import React from 'react';
import { 
  Construction, 
  RocketLaunch, 
  AutoAwesome,
  Favorite,
  Article,
  History,
  Palette
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../utils/getSubscriptionColors';

/**
 * ComingSoon Component - A reusable placeholder for pages under development
 * 
 * @param {Object} props
 * @param {string} props.title - Main title of the page
 * @param {string} props.subtitle - Optional subtitle/description
 * @param {string} props.type - Type of page for skeleton preview: 'posts', 'likes', 'history', 'style', 'default'
 * @param {React.ReactNode} props.icon - Optional custom icon
 * @param {Array} props.features - Optional list of upcoming features
 */
function ComingSoon({ 
  title = "Coming Soon", 
  subtitle = "We're working hard to bring you something amazing!",
  type = "default",
  icon,
  features = []
}) {
  const colors = useSubscriptionColors();

  // Skeleton preview based on page type
  const renderSkeleton = () => {
    switch (type) {
      case 'posts':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="aspect-square rounded-lg animate-pulse"
                style={{ 
                  background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.2)}, ${toRgba(colors.fourth, 0.1)})`,
                  border: `1px dashed ${toRgba(colors.fourth, 0.4)}`
                }}
              >
                <div className="h-full flex items-center justify-center">
                  <Article className="text-4xl opacity-30" style={{ color: colors.fourth }} />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'likes':
        return (
          <div className="space-y-3 mt-6">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className="flex items-center gap-4 p-4 rounded-lg animate-pulse"
                style={{ 
                  background: `linear-gradient(90deg, ${toRgba(colors.fourth, 0.15)}, transparent)`,
                  border: `1px dashed ${toRgba(colors.fourth, 0.3)}`
                }}
              >
                <div 
                  className="w-12 h-12 rounded-full"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.3) }}
                />
                <div className="flex-1 space-y-2">
                  <div 
                    className="h-4 rounded w-3/4"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.2) }}
                  />
                  <div
                    className="h-3 rounded w-1/2"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
                  />
                </div>
                <Favorite style={{ color: toRgba(colors.fourth, 0.5) }} />
              </div>
            ))}
          </div>
        );
      
      case 'history':
        return (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2 text-sm opacity-60">
              <History style={{ color: colors.fourth }} fontSize="small" />
              <span className="dark:text-gray-400">Today</span>
            </div>
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="p-4 rounded-lg animate-pulse flex items-center gap-3"
                style={{ 
                  background: toRgba(colors.fourth, 0.1),
                  borderLeft: `3px solid ${toRgba(colors.fourth, 0.6)}`
                }}
              >
                <div 
                  className="w-10 h-10 rounded"
                  style={{ backgroundColor: toRgba(colors.fourth, 0.25) }}
                />
                <div className="flex-1 space-y-2">
                  <div 
                    className="h-3 rounded w-2/3"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.2) }}
                  />
                  <div
                    className="h-2 rounded w-1/3"
                    style={{ backgroundColor: toRgba(colors.fourth, 0.15) }}
                  />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'style':
        return (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-lg animate-pulse flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(${45 + i * 30}deg, ${toRgba(colors.fourth, 0.3)}, ${toRgba(colors.fourth, 0.1)})`,
                    border: `2px dashed ${toRgba(colors.fourth, 0.4)}`
                  }}
                >
                  <Palette className="opacity-40" style={{ color: colors.fourth }} />
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return (
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="h-16 rounded-lg animate-pulse"
                style={{ 
                  background: `linear-gradient(90deg, ${toRgba(colors.fourth, (20 - i * 5) / 100)}, transparent)`,
                  border: `1px dashed ${toRgba(colors.fourth, 0.3)}`
                }}
              />
            ))}
          </div>
        );
    }
  };

  const DefaultIcon = () => (
    <div 
      className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
      style={{ 
        background: `linear-gradient(135deg, ${toRgba(colors.fourth, 0.3)}, ${toRgba(colors.fourth, 0.1)})`,
        border: `2px solid ${toRgba(colors.fourth, 0.5)}`
      }}
    >
      {icon || <RocketLaunch className="text-4xl" style={{ color: colors.fourth }} />}
    </div>
  );

  return (
    <div className="p-6 min-h-[400px]">
      {/* Header */}
      <div className="text-center mb-8">
        <DefaultIcon />
        
        <h1 
          className="text-2xl md:text-3xl font-bold mb-2 dark:text-dark-text text-light-text"
          style={{ 
            background: `linear-gradient(90deg, ${colors.fourth}, ${colors.first || colors.fourth})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {title}
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {subtitle}
        </p>
      </div>

      {/* Construction Badge */}
      <div 
        className="flex items-center justify-center gap-2 py-2 px-4 rounded-full w-fit mx-auto mb-6"
        style={{ 
          backgroundColor: toRgba(colors.fourth, 0.15),
          border: `1px solid ${toRgba(colors.fourth, 0.4)}`
        }}
      >
        <Construction className="text-sm animate-bounce" style={{ color: colors.fourth }} />
        <span className="text-sm font-medium" style={{ color: colors.fourth }}>
          Under Development
        </span>
        <AutoAwesome className="text-sm" style={{ color: colors.fourth }} />
      </div>

      {/* Features Preview (if provided) */}
      {features.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 dark:text-gray-300 text-gray-700 text-center">
            Coming Features:
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {features.map((feature, i) => (
              <span 
                key={i}
                className="text-xs px-3 py-1 rounded-full"
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
      )}

      {/* Skeleton Preview */}
      <div className="max-w-lg mx-auto">
        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mb-2">
          Preview of what's coming:
        </p>
        {renderSkeleton()}
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

export default ComingSoon;
