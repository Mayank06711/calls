import React, { useState, useEffect, useRef } from 'react';

const TypingEffect = ({ text, stopTyping, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const isTypingRef = useRef(false);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    // Start typing only if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
    }

    // Handle immediate stop
    if (stopTyping) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      onComplete();
      isTypingRef.current = false;
      return;
    }

    // Continue typing
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 30);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
      isTypingRef.current = false;
    }
  }, [currentIndex, stopTyping, onComplete]);

  // Prevent re-renders from parent component affecting the typing
  const memoizedDisplay = React.useMemo(() => (
    <>
      <span>{displayedText}</span>
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
      )}
    </>
  ), [displayedText, currentIndex]);

  return memoizedDisplay;
};

export default React.memo(TypingEffect);