import { useState, useRef } from 'react';
import { VideoCall, CloudUpload, Close } from '@mui/icons-material';
import { uploadImage } from '../../../../socket/handleImageUpload';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

function Reels() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const colors = useSubscriptionColors();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);
    setUploadedUrl('');

    try {
      const result = await uploadImage({
        file,
        type: 'reel',
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        metadata: {
          uploadType: 'cloudinary',
          folder: 'reels',
        },
      });

      setUploadedUrl(result.fileUrl || result.url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="video/mp4,video/webm"
        className="hidden"
      />

      {!uploadedUrl && !uploading && (
        <div className="text-center">
          <VideoCall sx={{ fontSize: 48, color: colors.third }} />
          <p className="text-light-text/60 dark:text-dark-text/60 mt-2 text-sm">
            Upload a reel (max 8MB)
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-6 py-2 rounded-full text-white text-sm font-medium transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`,
            }}
          >
            <CloudUpload sx={{ fontSize: 18, mr: 1 }} />
            Select Video
          </button>
        </div>
      )}

      {uploading && (
        <div className="w-full max-w-xs">
          <p className="text-sm text-light-text/70 dark:text-dark-text/70 mb-2 text-center">
            Uploading... {uploadProgress}%
          </p>
          <div className="w-full h-2 rounded-full bg-light-secondary/10 dark:bg-dark-secondary/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadProgress}%`,
                background: `linear-gradient(90deg, ${colors.third}, ${colors.fourth})`,
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <Close sx={{ fontSize: 16 }} />
          {error}
        </div>
      )}

      {uploadedUrl && (
        <div className="w-full max-w-sm">
          <video
            src={uploadedUrl}
            controls
            className="w-full rounded-lg shadow-lg"
            style={{ maxHeight: '400px' }}
          />
          <button
            onClick={() => {
              setUploadedUrl('');
              setUploadProgress(0);
            }}
            className="mt-3 w-full py-2 rounded-full text-sm font-medium text-white transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`,
            }}
          >
            Upload Another
          </button>
        </div>
      )}
    </div>
  );
}

export default Reels;
