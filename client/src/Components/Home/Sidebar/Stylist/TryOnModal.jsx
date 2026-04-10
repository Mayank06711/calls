import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  CloseOutlined,
  PersonOutlined,
  AutoAwesomeOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { getCloudinaryThumbnail, uploadFile } from '../../../../utils/cloudinaryUtils';
import { requestTryOn, generateTryOnUploadUrl } from '../../../../redux/thunks/booking.thunks';

const TryOnModal = ({ item, bookingId, role, clientPhotos, colors, onClose }) => {
  const dispatch = useDispatch();

  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const allAvailablePhotos = [...(clientPhotos || []), ...uploadedPhotos];
  const styleImages = (item?.images || []).slice(0, 2);

  const togglePhoto = (photoUrl) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(photoUrl)) return prev.filter((p) => p !== photoUrl);
      if (prev.length >= 2) return prev;
      return [...prev, photoUrl];
    });
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadData = await dispatch(generateTryOnUploadUrl(bookingId, file.name));
      if (uploadData) {
        const fileUrl = await uploadFile(file, {
          provider: uploadData.provider || 'cloudinary',
          uploadUrl: uploadData.uploadUrl,
          uploadParams: {
            api_key: uploadData.apiKey,
            timestamp: uploadData.timestamp,
            signature: uploadData.signature,
            public_id: uploadData.publicId,
          },
        });
        if (fileUrl) {
          setUploadedPhotos((prev) => [...prev, { url: fileUrl, thumbnail_url: fileUrl }]);
          if (selectedPhotos.length < 2) {
            setSelectedPhotos((prev) => [...prev, fileUrl]);
          }
        }
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (selectedPhotos.length !== 2 || requesting) return;
    setRequesting(true);
    const result = await dispatch(requestTryOn(bookingId, item._id, selectedPhotos));
    setRequesting(false);
    if (result) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-dark-primary w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CloseOutlined sx={{ fontSize: 20 }} />
          </button>
          <div
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.fourth }}
          />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
            Generating Try-On...
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This takes about 30-60 seconds. You'll be notified when it's ready!
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: colors.fourth }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-primary w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <CloseOutlined sx={{ fontSize: 20 }} />
        </button>

        <div className="p-5 space-y-5">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
              Virtual Try-On
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select 2 photos of {role === 'user' ? 'yourself' : 'the client'} (front + side view recommended)
            </p>
          </div>

          {/* Style reference images */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              Style Reference
            </p>
            <div className="flex gap-2">
              {styleImages.map((img, i) => (
                <img
                  key={i}
                  src={getCloudinaryThumbnail(img, 200, 200)}
                  alt={`Style ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
              ))}
              {styleImages.length === 0 && (
                <p className="text-xs text-gray-400">No style images available</p>
              )}
            </div>
          </div>

          {/* Person photo selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Person Photos ({selectedPhotos.length}/2)
              </p>
              <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">
                <CloudUploadOutlined sx={{ fontSize: 14 }} />
                {uploading ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPhoto}
                  disabled={uploading}
                />
              </label>
            </div>

            {allAvailablePhotos.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <PersonOutlined className="text-gray-300" sx={{ fontSize: 40 }} />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  No photos available. Upload photos to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {allAvailablePhotos.map((photo, i) => {
                  const url = photo.url || photo.thumbnail_url;
                  const isSelected = selectedPhotos.includes(url);
                  return (
                    <div
                      key={i}
                      onClick={() => togglePhoto(url)}
                      className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      style={isSelected ? { borderColor: colors.fourth } : {}}
                    >
                      <img
                        src={getCloudinaryThumbnail(url, 200, 200)}
                        alt={`Photo ${i + 1}`}
                        className="w-full h-24 object-cover"
                      />
                      {isSelected && (
                        <div
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.fourth }}
                        >
                          <CheckCircleOutlined sx={{ fontSize: 14 }} className="text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={selectedPhotos.length !== 2 || requesting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: colors.fourth }}
          >
            <AutoAwesomeOutlined sx={{ fontSize: 18 }} />
            {requesting ? 'Requesting...' : 'Generate Try-On'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TryOnModal;
