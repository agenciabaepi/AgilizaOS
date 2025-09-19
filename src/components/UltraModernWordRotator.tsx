'use client';

import { useState, useEffect } from 'react';

interface UltraModernWordRotatorProps {
  words: string[];
  interval?: number;
  className?: string;
  textClassName?: string;
}

export default function UltraModernWordRotator({ 
  words, 
  interval = 3000, 
  className = '',
  textClassName = ''
}: UltraModernWordRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  if (words.length === 0) return null;

  return (
    <span className={`relative inline-block ${className}`}>
      <span 
        className={`inline-block transition-all duration-500 ease-in-out ${textClassName}`}
        style={{
          background: 'linear-gradient(135deg, #D1FE6E 0%, #B8E55A 50%, #A5D44A 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(209, 254, 110, 0.3)',
          display: 'inline-block',
          lineHeight: '1.2',
          paddingBottom: '0.1em',
          verticalAlign: 'baseline'
        }}
        key={`word-${currentIndex}`}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
} 