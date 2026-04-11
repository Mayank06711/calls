import React from 'react';
import { ErrorOutline } from '@mui/icons-material';
import { getCloudinaryThumbnail } from '../../../../utils/cloudinaryUtils';
import dayjs from 'dayjs';

const STATUS_CONFIG = {
  pending: { label: 'Queued', color: '#F59E0B' },
  generating: { label: 'Generating...', color: '#3B82F6' },
  completed: { label: 'Ready', color: '#10B981' },
  failed: { label: 'Failed', color: '#EF4444' },
};

const TryOnResultCard = ({ result, colors, onImageClick }) => {
  const status = STATUS_CONFIG[result.status] || STATUS_CONFIG.pending;
  const isProcessing = result.status === 'pending' || result.status === 'generating';

  return (
    <div className="bg-white dark:bg-dark-primary rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {result.resultImageUrl ? (
        <img
          src={getCloudinaryThumbnail(result.resultImageUrl, 400, 400)}
          alt="Try-On Result"
          className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick?.(result.resultImageUrl)}
        />
      ) : isProcessing ? (
        <div className="w-full h-48 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mb-2"
            style={{ borderColor: colors.fourth }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">{status.label}</p>
        </div>
      ) : (
        <div className="w-full h-48 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20">
          <ErrorOutline className="text-red-400" sx={{ fontSize: 32 }} />
          <p className="text-xs text-red-500 mt-1 px-2 text-center">
            {result.error || 'Generation failed'}
          </p>
        </div>
      )}

      <div className="p-2.5">
        <div className="flex items-center justify-between">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {status.label}
          </span>
          <span className="text-[9px] text-gray-400">
            {dayjs(result.requestedAt).format('h:mm A')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TryOnResultCard;
