import React, { useEffect, useRef } from 'react';
import './customScrollbar.css';
import { useSubscriptionColors } from '../utils/getSubscriptionColors';

const ScrollbarWrapper = ({ 
  children, 
  className = '',
  style = {}
}) => {
  const wrapperRef = useRef(null);
  const colors = useSubscriptionColors(); // Using your existing hook

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    
    // Set CSS variables for the scrollbar colors using your color scheme
    wrapper.style.setProperty('--scrollbar-track', `${colors.first}`); // Light track
    wrapper.style.setProperty('--scrollbar-thumb', `${colors.third}`); // Main thumb color
    wrapper.style.setProperty('--scrollbar-thumb-hover', colors.fourth); // Hover color
  }, [colors]);

  return (
    <div 
      ref={wrapperRef}
      className={`custom-scrollbar ${className}`}
      style={{
        ...style,
        overflow: 'auto'
      }}
    >
      {children}
    </div>
  );
};

export default ScrollbarWrapper;