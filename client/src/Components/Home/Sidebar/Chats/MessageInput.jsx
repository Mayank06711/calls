
import React, { useState, useRef } from 'react';
import { AttachFile, Send, Image, Close } from '@mui/icons-material';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      // Create preview
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
        const uploadedFile = await handleImageUpload({
          file: selectedFile,
          type: 'chat',
          onProgress: (progress) => {
            console.log('Upload progress:', progress);
          }
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
    <div className="border-t border-gray-200 bg-white p-4">
      {filePreview && (
        <div className="relative mb-2 inline-block">
          <img 
            src={filePreview} 
            alt="Preview" 
            className="h-20 w-20 object-cover rounded"
          />
          <button
            onClick={clearFileSelection}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
          >
            <Close fontSize="small" />
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          <Image />
        </button>

        <input
          type="text"
          value={message}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={!message.trim() && !selectedFile}
          className="p-2 bg-blue-500 text-white rounded-full disabled:opacity-50"
        >
          <Send />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;