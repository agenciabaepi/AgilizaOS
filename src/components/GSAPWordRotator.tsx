'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar o ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const containerRef = useRef<HTMLSpanElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  const currentWordIndex = useRef(0);

  useEffect(() => {
    if (!containerRef.current || !currentWordRef.current) return;

    const container = containerRef.current;
    const wordElement = currentWordRef.current;

    // Função para animar mudança de palavra
    const animateWordChange = (newWord: string) => {
      const text = newWord;
      wordElement.innerHTML = '';

      // Criar spans para cada caractere
      [...text].forEach((char, i) => {
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
          // No modo escuro, usar cor verde do gradiente
          span.style.color = '#D1FE6E';
        } else {
          // No modo claro, usar cor cinza escura
          span.style.color = '#374151'; // gray-700
        }

        // Tamanhos responsivos
        if (window.innerWidth <= 600) {
          span.style.fontSize = '28px';
        } else {
          span.style.fontSize = '48px';
        }

        wordElement.appendChild(span);
      });

      const spans = wordElement.querySelectorAll('span');

      // Animação de entrada
      gsap.fromTo(spans,
        { opacity: 0 },
        {
          opacity: 1,
          ease: "power2.out",
          stagger: 0.05,
          duration: 0.3
        }
      );
    };

    // Rotacionar palavras
    const rotateWords = () => {
      currentWordIndex.current = (currentWordIndex.current + 1) % words.length;
      animateWordChange(words[currentWordIndex.current]);
    };

    // Inicializar com primeira palavra
    animateWordChange(words[0]);

    // Configurar intervalo
    const intervalId = setInterval(rotateWords, interval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === container) {
          trigger.kill();
        }
      });
    };
  }, [words, interval, isDarkMode]);

  return (
    <span ref={containerRef} className={className}>
      <span ref={currentWordRef}></span>
    </span>
  );
}
