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
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (words.length <= 1) return;

    const timer = setInterval(() => {
      setIsAnimating(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 600);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  if (words.length === 0) return null;

  return (
    <span className={`relative inline-block leading-none ${className}`} style={{ lineHeight: '1.4', paddingBottom: '8px' }}>
      <span 
        className={`inline-block transition-all duration-800 ease-out ${
          isAnimating 
            ? 'opacity-0 -translate-y-8 scale-85 blur-md' 
            : 'opacity-100 translate-y-0 scale-100 blur-0'
        } ${textClassName}`}
        style={{
          transformOrigin: 'center',
          willChange: 'transform, opacity, filter',
          background: 'linear-gradient(135deg, #D1FE6E 0%, #B8E55A 25%, #A5D44A 50%, #8BC34A 75%, #4CAF50 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundSize: '300% 300%',
          animation: isAnimating ? 'ultraGradientShift 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'ultraGradientIdle 3s ease-in-out infinite',
          textShadow: isAnimating ? '0 0 20px rgba(209, 254, 110, 0.5)' : '0 0 10px rgba(209, 254, 110, 0.3)',
          filter: isAnimating ? 'drop-shadow(0 0 8px rgba(209, 254, 110, 0.6))' : 'drop-shadow(0 0 4px rgba(209, 254, 110, 0.4))',
          display: 'inline-block',
          lineHeight: '1.4',
          paddingBottom: '8px',
          paddingTop: '2px'
        }}
      >
        {words[currentIndex]}
      </span>

      <style jsx>{`
        @keyframes ultraGradientShift {
          0% {
            background-position: 0% 50%;
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0) drop-shadow(0 0 4px rgba(209, 254, 110, 0.4));
          }
          20% {
            opacity: 0.8;
            transform: translateY(-4px) scale(0.95);
            filter: blur(2px) drop-shadow(0 0 6px rgba(209, 254, 110, 0.5));
          }
          50% {
            opacity: 0;
            transform: translateY(-32px) scale(0.85);
            filter: blur(4px) drop-shadow(0 0 8px rgba(209, 254, 110, 0.6));
          }
          100% {
            background-position: 100% 50%;
            opacity: 0;
            transform: translateY(-32px) scale(0.85);
            filter: blur(4px) drop-shadow(0 0 8px rgba(209, 254, 110, 0.6));
          }
        }

        @keyframes ultraGradientIdle {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </span>
  );
} 