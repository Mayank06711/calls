import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, Close, AddCircleOutline, CheckroomOutlined } from '@mui/icons-material';
import { ClickAwayListener } from '@mui/material';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { uploadImage } from '../../../../socket/handleImageUpload';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import { showNotification } from '../../../../redux/actions/notification.actions';
import { fetchOutfitsThunk, fetchSavedOutfitsThunk, sendOutfitThunk } from '../../../../redux/thunks/wardrobe.thunks';

const MessageInput = ({ onSendMessage, onTyping, recipientUsername }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOutfitPicker, setShowOutfitPicker] = useState(false);
  const pendingOutfitRef = useRef(null); // outfitId to save to recipient on send
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const objectUrlRef = useRef(null);
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const ownOutfits = useSelector((s) => s.wardrobe?.outfits?.saved) || [];
  const savedFromOthers = useSelector((s) => s.wardrobe?.outfits?.savedFromOthers) || [];
  const outfits = [...ownOutfits, ...savedFromOthers];
  const outfitsLoading = useSelector((s) => s.wardrobe?.outfits?.loading);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px (~5 lines)
      textarea.style.height = `${newHeight}px`;
    }
  }, [message]);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    setMessage(e.target.value);
    handleTypingStatus(true);
  };

  const handleTypingStatus = (isTyping) => {
    onTyping(isTyping);
    clearTimeout(typingTimeoutRef.current);
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1000);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImageFile = file.type.startsWith('image/');
    const isVideoFile = file.type.startsWith('video/');

    if (isImageFile || isVideoFile) {
      setSelectedFile(file);
      setIsVideo(isVideoFile);

      // Revoke previous object URL if any
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      if (isVideoFile) {
        // Use object URL for video preview (efficient, no base64 conversion)
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setFilePreview(url);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } else {
      dispatch(showNotification('Please select an image or video file', 'error'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSending) return;
    handleTypingStatus(false);

    // Capture current values and clear input immediately
    const fileToSend = selectedFile;
    const textToSend = message.trim();

    if (!fileToSend && !textToSend) return;

    // Generate a local preview URL for optimistic display before clearing
    let localPreviewUrl = null;
    if (fileToSend) {
      localPreviewUrl = URL.createObjectURL(fileToSend);
    }

    setIsSending(true);
    if (fileToSend) clearFileSelection();
    if (textToSend) setMessage('');

    // Save outfit to recipient's wardrobe on actual send (same as notification flow)
    const outfitToSave = pendingOutfitRef.current;
    pendingOutfitRef.current = null;
    if (outfitToSave && recipientUsername) {
      dispatch(sendOutfitThunk(outfitToSave, recipientUsername, true));
    }

    try {
      if (fileToSend) {
        const fileIsVideo = fileToSend.type.startsWith('video/');
        console.log(`[MessageInput]: Uploading ${fileIsVideo ? 'video' : 'image'}...`);

        // Send optimistic message with local preview immediately
        await onSendMessage({
          type: fileIsVideo ? 'video' : 'image',
          content: localPreviewUrl,
          fileName: fileToSend.name,
          _uploading: true,
          _file: fileToSend,
          metadata: {
            fileSize: fileToSend.size || null,
            fileType: fileToSend.type || '',
            uploadedAt: new Date().toISOString(),
            originalName: fileToSend.name,
            uploaderId: '',
            description: '',
            tags: [],
            isEdited: false,
            isCompressed: false,
            resolution: '',
            exifData: {},
            customData: {}
          }
        });
      }

      if (textToSend) {
        await onSendMessage({
          type: 'text',
          content: textToSend,
          metadata: {
            fileSize: null,
            fileType: '',
            uploadedAt: null,
            width: null,
            height: null,
            duration: null,
            thumbnailUrl: '',
            originalName: '',
            uploaderId: '',
            description: '',
            tags: [],
            isEdited: false,
            isCompressed: false,
            resolution: '',
            exifData: {},
            customData: {}
          }
        });
      }
    } catch (error) {
      console.error('[MessageInput]: Send failed:', error);
      dispatch(showNotification(error.message || 'Failed to send message', 'error'));
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenOutfitPicker = useCallback(() => {
    setShowAttachMenu(false);
    setShowOutfitPicker(true);
    if (!ownOutfits.length && !outfitsLoading) {
      dispatch(fetchOutfitsThunk());
    }
    if (!savedFromOthers.length && !outfitsLoading) {
      dispatch(fetchSavedOutfitsThunk());
    }
  }, [ownOutfits.length, savedFromOthers.length, outfitsLoading, dispatch]);

  const handleShareOutfit = useCallback((outfit) => {
    pendingOutfitRef.current = outfit._id;
    const link = `${window.location.origin}/wardrobe/outfits/${outfit._id}`;
    const label = outfit.name || "My Outfit";
    setMessage((prev) => prev ? `${prev}\n${label} — ${link}` : `${label} — ${link}`);
    setShowOutfitPicker(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview('');
    setIsVideo(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative border-t border-light-secondary/10 dark:border-dark-secondary/10 bg-light-primary dark:bg-dark-primary p-3">
      {filePreview && (
        <div className="relative mb-3 inline-block group">
          {isVideo ? (
            <video
              src={filePreview}
              className="h-24 w-24 object-cover rounded-lg ring-2 ring-opacity-50"
              style={{ ringColor: colors.third }}
              muted
            />
          ) : (
            <img
              src={filePreview}
              alt="Preview"
              className="h-24 w-24 object-cover rounded-lg ring-2 ring-opacity-50"
              style={{ ringColor: colors.third }}
            />
          )}
          <button
            onClick={clearFileSelection}
            className="absolute -top-2 -right-2 p-1 rounded-full transition-transform hover:scale-110 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`,
              color: 'white'
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </button>
          <div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(0deg, ${toRgba(colors.fourth, 0.8)}, transparent)`
            }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,video/mp4,video/webm,.gif"
          className="hidden"
        />

        <div className="flex-1 relative flex items-end"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: colors.fourth,
            borderRadius: '1rem',
            background: 'var(--color-light-secondary-5, transparent)',
          }}
        >
          {/* Attach menu */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowAttachMenu((v) => !v)}
              disabled={isSending}
              className="p-2 ml-1 mb-0.5 rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-50"
              style={{ color: colors.third }}
            >
              <AddCircleOutline sx={{ fontSize: 22 }} />
            </button>
            {showAttachMenu && (
              <ClickAwayListener onClickAway={() => setShowAttachMenu(false)}>
                <div
                  className="absolute bottom-full left-0 mb-2 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/40 overflow-hidden z-50"
                  style={{ background: 'var(--tw-color-light-primary, #fff)' }}
                >
                  <div className="dark:bg-dark-primary bg-white min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/30 dark:text-dark-text text-light-text transition-colors"
                    >
                      <Image sx={{ fontSize: 18, color: colors.fourth }} />
                      Media
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenOutfitPicker}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/30 dark:text-dark-text text-light-text transition-colors"
                    >
                      <CheckroomOutlined sx={{ fontSize: 18, color: colors.fourth }} />
                      Outfit
                    </button>
                  </div>
                </div>
              </ClickAwayListener>
            )}
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={(e) => {
              // Submit on Enter (without Shift), allow Shift+Enter for new line
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type a message..."
            rows={1}
            className="message-textarea w-full px-2 py-2.5 transition-all duration-200 resize-none
                     bg-transparent
                     text-light-text dark:text-dark-text
                     placeholder-light-text/50 dark:placeholder-dark-text/50
                     focus:outline-none"
            style={{
              border: 'none',
              minHeight: '42px',
              maxHeight: '120px',
              lineHeight: '1.4',
              overflowY: message.includes('\n') || (textareaRef.current?.scrollHeight > 50) ? 'auto' : 'hidden',
              scrollbarWidth: 'thin',
              scrollbarColor: `${colors.fourth} transparent`,
            }}
            spellCheck={true}
          />
          {/* Custom scrollbar - only visible when content overflows */}
          <style>{`
            .message-textarea::-webkit-scrollbar {
              width: 4px;
            }
            .message-textarea::-webkit-scrollbar-track {
              background: transparent;
              margin: 8px 0;
            }
            .message-textarea::-webkit-scrollbar-thumb {
              background: ${colors.fourth};
              border-radius: 4px;
            }
            .message-textarea::-webkit-scrollbar-thumb:hover {
              background: ${colors.third};
            }
          `}</style>
        </div>

        <button
          type="submit"
          disabled={isSending || (!message.trim() && !selectedFile)}
          className="p-2.5 mb-0.5 rounded-full transition-all duration-200 disabled:opacity-50
                   hover:scale-110 disabled:hover:scale-100 shadow-lg disabled:shadow-none"
          style={{
            background: `linear-gradient(135deg, ${colors.third}, ${colors.fourth})`,
            color: 'white'
          }}
        >
          <Send sx={{ fontSize: 20 }} />
        </button>
      </form>

      {/* Outfit picker panel */}
      {showOutfitPicker && (
        <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/40 z-50 dark:bg-dark-primary bg-white overflow-hidden"
          style={{ maxHeight: 280 }}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700/20">
            <span className="text-xs font-semibold dark:text-dark-text text-light-text">Share an outfit</span>
            <button type="button" onClick={() => setShowOutfitPicker(false)} className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/30">
              <Close sx={{ fontSize: 16 }} className="dark:text-dark-text/60 text-light-text/60" />
            </button>
          </div>
          <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 232 }}>
            {outfitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: colors.fourth }} />
              </div>
            ) : outfits.length === 0 ? (
              <p className="text-center py-6 text-xs dark:text-dark-text/40 text-light-text/40">
                No outfits yet. Create one in your wardrobe!
              </p>
            ) : (
              outfits.map((outfit) => (
                <button
                  key={outfit._id}
                  type="button"
                  onClick={() => handleShareOutfit(outfit)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors text-left disabled:opacity-50"
                >
                  {/* Outfit thumbnail */}
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700/30">
                    {(outfit.flatlayUrl || outfit.screenshotUrl) ? (
                      <img src={outfit.flatlayUrl || outfit.screenshotUrl} alt="" className="w-full h-full object-cover" />
                    ) : outfit.items?.length > 0 ? (
                      <div className={`w-full h-full grid ${outfit.items.length >= 4 ? 'grid-cols-2 grid-rows-2' : outfit.items.length >= 2 ? 'grid-cols-2 grid-rows-1' : ''}`}>
                        {(outfit.items.length === 1 ? outfit.items : outfit.items.slice(0, 4)).map((item, idx) => (
                          <img
                            key={idx}
                            src={item.thumbnailUrl || item.nobgUrl || item.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CheckroomOutlined sx={{ fontSize: 16 }} className="dark:text-dark-text/30 text-light-text/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">
                      {outfit.name || "Untitled Outfit"}
                    </p>
                    <p className="text-[10px] dark:text-dark-text/40 text-light-text/40">
                      {outfit.items?.length || 0} items{outfit.occasion ? ` · ${outfit.occasion}` : ''}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  onTyping: PropTypes.func.isRequired,
  recipientUsername: PropTypes.string,
};

export default MessageInput;
