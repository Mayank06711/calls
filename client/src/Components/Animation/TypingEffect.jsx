import React, { useState, useEffect, useCallback } from 'react';

const TypingEffect = ({ text, speed = 30, onComplete, stopTyping }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const typeNextCharacter = useCallback(() => {
    if (!text) return;
    
    if (currentIndex < text.length) {
      // Type character by character
      const nextChar = text[currentIndex];
      setDisplayedText(prev => prev + nextChar);
      setCurrentIndex(prev => prev + 1);
    } else {
      // Typing is complete
      if (onComplete) {
        onComplete();
      }
    }
  }, [currentIndex, text, onComplete]);

  // Reset effect when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  // Handle typing animation
  useEffect(() => {
    if (!text || stopTyping) {
      // If stopped, show full text immediately
      setDisplayedText(text || '');
      setCurrentIndex(text ? text.length : 0);
      if (onComplete) onComplete();
      return;
    }

    // Continue typing with delay
    const timeout = setTimeout(typeNextCharacter, speed);
    return () => clearTimeout(timeout);
  }, [text, currentIndex, speed, stopTyping, typeNextCharacter]);

  return (
    <div className="min-h-[20px]">
      {displayedText}
      {currentIndex < (text?.length || 0) && (
        <span className="animate-pulse ml-[1px]">|</span>
      )}
    </div>
  );
};

// Only re-render when necessary props change
export default React.memo(TypingEffect, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.stopTyping === nextProps.stopTyping &&
    prevProps.speed === nextProps.speed
  );
});