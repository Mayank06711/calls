import { useState, useRef, useEffect } from 'react';
import { Send, Image, Close } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { uploadImage } from '../../../../socket/handleImageUpload';
import { useSubscriptionColors, toRgba } from '../../../../utils/getSubscriptionColors';
import { showNotification } from '../../../../redux/actions/notification.actions';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const objectUrlRef = useRef(null);
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();

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
    <div className="border-t border-light-secondary/10 dark:border-dark-secondary/10 bg-light-primary dark:bg-dark-primary p-3">
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="p-2 ml-1 mb-0.5 rounded-full transition-all duration-200 hover:scale-110 flex-shrink-0 disabled:opacity-50"
            style={{ color: colors.third }}
          >
            <Image sx={{ fontSize: 22 }} />
          </button>
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
    </div>
  );
};

MessageInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  onTyping: PropTypes.func.isRequired,
};

export default MessageInput;
