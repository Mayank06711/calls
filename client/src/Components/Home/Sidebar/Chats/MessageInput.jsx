import { useState, useRef } from 'react';
import { Send, Image, Close } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { uploadImage } from '../../../../socket/handleImageUpload';
import { useSubscriptionColors } from '../../../../utils/getSubscriptionColors';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const colors = useSubscriptionColors();

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

    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select an image file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleTypingStatus(false);

    if (selectedFile) {
      try {
        console.log('[c1-s] Image send button clicked, uploading image to server...');
        const uploadedFile = await uploadImage({
          file: selectedFile,
          type: 'chat',
          onProgress: (progress) => {
            console.log('Upload progress:', progress);
          },
          metadata: {
            uploadType: 'cloudinary',
            folder: 'chat_images',
          },
        });
        await onSendMessage({
          type: 'image',
          content: uploadedFile.url,
          fileName: selectedFile.name
        });
        clearFileSelection();
      } catch (error) {
        console.error('Failed to upload file:', error);
        alert('Failed to upload file');
      }
    }

    if (message.trim()) {
      await onSendMessage({
        type: 'text',
        content: message.trim()
      });
      setMessage('');
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-light-secondary/10 dark:border-dark-secondary/10 bg-light-primary dark:bg-dark-primary p-3">
      {filePreview && (
        <div className="relative mb-3 inline-block group">
          <img 
            src={filePreview} 
            alt="Preview" 
            className="h-24 w-24 object-cover rounded-lg ring-2 ring-opacity-50"
            style={{ ringColor: colors.third }}
          />
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
              background: `linear-gradient(0deg, ${colors.fourth}80, transparent)`
            }}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full transition-all duration-200 hover:scale-110"
          style={{
            color: colors.third,
            '&:hover': {
              color: colors.fourth
            }
          }}
        >
          <Image />
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={handleChange}
            placeholder="Type a message..."
            className="w-full px-4 py-2.5 rounded-full transition-all duration-200 
                     bg-light-secondary/5 dark:bg-dark-secondary/5
                     text-light-text dark:text-dark-text
                     placeholder-light-text/50 dark:placeholder-dark-text/50
                     focus:outline-none"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: `${colors.third}40`,
              '&:focus': {
                borderColor: colors.fourth,
                boxShadow: `0 0 0 2px ${colors.fourth}20`
              }
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() && !selectedFile}
          className="p-2.5 rounded-full transition-all duration-200 disabled:opacity-50 
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