'use client';

import { useEffect, useRef, useState } from 'react';

interface GSAPWordRotatorProps {
  words: string[];
  interval?: number;
  isDarkMode: boolean;
  className?: string;
}

export default function GSAPWordRotator({ 
  words, 
  interval = 3000, 
  isDarkMode,
  className = ''
}: GSAPWordRotatorProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }, interval);

    return () => clearInterval(intervalId);
  }, [words.length, interval]);

  useEffect(() => {
    if (!wordRef.current) return;

    const wordElement = wordRef.current;
    const currentWord = words[currentWordIndex];
    
    // Função para animar entrada da palavra
    const animateWordIn = () => {
      setIsAnimating(true);
      
      wordElement.innerHTML = '';
      
      // Criar spans para cada caractere
      [...currentWord].forEach((char, i) => {
        const span = document.createElement('span');
        
        if (char === ' ') {
          span.innerHTML = '&nbsp;';
          span.style.width = '0.2em';
          span.style.display = 'inline-block';
        } else {
          span.textContent = char;
        }

        span.style.display = 'inline-block';
        span.style.opacity = '0';
        span.style.fontWeight = '700';
        
        // Cores condicionais
        if (isDarkMode) {
          span.style.color = '#D1FE6E';
        } else {
          span.style.color = '#374151'; // gray-700
        }

        wordElement.appendChild(span);
      });

      const spans = wordElement.querySelectorAll('span');

      // Animação simples com CSS + setTimeout
      spans.forEach((span, index) => {
        setTimeout(() => {
          span.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          span.style.opacity = '1';
          span.style.transform = 'translateY(0)';
        }, index * 80); // 80ms entre cada letra
      });

      // Marcar como não animando após um tempo
      setTimeout(() => setIsAnimating(false), currentWord.length * 80 + 300);
    };

    animateWordIn();
  }, [currentWordIndex, words, isDarkMode]);

  return (
    <span className={className}>
      <span ref={wordRef}></span>
    </span>
  );
}
