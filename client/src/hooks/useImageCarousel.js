import { useState, useEffect } from "react";

export const useImageCarousel = (photos, interval = 3000) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCarouselActive, setIsCarouselActive] = useState(true);

  useEffect(() => {
    if (!photos || photos.length <= 1 || !isCarouselActive) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [photos, interval, isCarouselActive]);

  const getCurrentPhoto = () => {
    if (!photos || photos.length === 0) return null;
    return photos[currentIndex];
  };

  const toggleCarousel = () => {
    setIsCarouselActive((prev) => !prev);
  };

  return {
    currentPhoto: getCurrentPhoto(),
    isCarouselActive,
    toggleCarousel,
  };
};
