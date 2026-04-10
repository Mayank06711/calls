import React from 'react';
import { AutoAwesomeOutlined } from '@mui/icons-material';
import { toRgba } from '../../../../utils/getSubscriptionColors';
import TryOnResultCard from './TryOnResultCard';

const TryOnResults = ({ results, colors, onImageClick }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="bg-white dark:bg-dark-primary rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="p-1.5 rounded-lg"
          style={{ backgroundColor: toRgba(colors.fourth, 0.1) }}
        >
          <AutoAwesomeOutlined sx={{ fontSize: 18 }} style={{ color: colors.fourth }} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-dark-text">
            Virtual Try-Ons
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {results.map((result) => (
          <TryOnResultCard
            key={result._id || result.tryOnResultId}
            result={result}
            colors={colors}
            onImageClick={onImageClick}
          />
        ))}
      </div>
    </div>
  );
};

export default TryOnResults;
