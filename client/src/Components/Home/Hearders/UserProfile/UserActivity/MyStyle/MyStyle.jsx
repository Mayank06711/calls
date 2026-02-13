import React from 'react';
import { 
  Checkroom, 
  Face, 
  Palette, 
  Style,
  Diamond,
  WbSunny,
  Favorite,
  AutoAwesome,
  Construction
} from '@mui/icons-material';
import { useSubscriptionColors, toRgba } from '../../../../../../utils/getSubscriptionColors';

function MyStyle() {
  const colors = useSubscriptionColors();
  
  // Skeleton card component
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
          <Style className="text-4xl" style={{ color: colors.fourth }} />
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
          My Personal Style
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Define your unique style preferences - from fashion to beauty, let us know what makes you, you!
        </p>
        
        {/* Under Development Badge */}
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

      {/* Style Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        
        {/* Body Profile */}
        <SkeletonCard 
          icon={Face}
          title="Body Profile"
          items={['Body Type', 'Skin Tone', 'Height', 'Body Shape']}
        />
        
        {/* Fashion Preferences */}
        <SkeletonCard 
          icon={Checkroom}
          title="Fashion Style"
          items={['Casual Wear', 'Formal Wear', 'Ethnic Wear', 'Preferred Brands']}
        />
        
        {/* Color Preferences */}
        <SkeletonCard 
          icon={Palette}
          title="Color Preferences"
          items={['Favorite Colors', 'Avoid Colors', 'Seasonal Palette', 'Neutral Preferences']}
        />
        
        {/* Occasion Styles */}
        <SkeletonCard 
          icon={Diamond}
          title="Occasion Styles"
          items={['Work/Office', 'Party/Night Out', 'Weekend Casual', 'Special Events']}
        />
        
        {/* Climate Preferences */}
        <SkeletonCard 
          icon={WbSunny}
          title="Climate & Comfort"
          items={['Weather Preference', 'Fabric Choices', 'Comfort Level', 'Activity Type']}
        />
        
        {/* Style Inspirations */}
        <SkeletonCard 
          icon={Favorite}
          title="Style Inspirations"
          items={['Celebrity Styles', 'Fashion Icons', 'Mood Board', 'Pinterest Collections']}
        />
      </div>

      {/* Features Preview */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold mb-3 dark:text-gray-300 text-gray-700 text-center">
          What you'll be able to do:
        </h3>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Create Style Profile',
            'Get Personalized Recommendations',
            'Virtual Wardrobe',
            'Mix & Match Outfits',
            'Style Quiz',
            'Expert Consultations',
            'Trend Alerts',
            'Shopping Suggestions'
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

export default MyStyle;
