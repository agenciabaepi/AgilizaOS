import { useEffect, useRef } from 'react';

interface UseGSAPTextAnimationProps {
  isDarkMode: boolean;
}

export const useGSAPTextAnimation = ({ isDarkMode }: UseGSAPTextAnimationProps) => {
  const elementRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current) return;

    const element = elementRef.current;
    const text = element.textContent?.trim() || '';
    
    // Limpar conteúdo anterior
    element.innerHTML = '';

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

      // Estilos básicos
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.fontWeight = '700';
      span.style.lineHeight = '1.2';
      span.style.marginBottom = '0';
      
      // Cores condicionais
      if (isDarkMode) {
        span.style.color = 'inherit'; // Herda o gradiente CSS
      } else {
        span.style.color = '#1f2937'; // gray-800
      }

      element.appendChild(span);
    });

    // Animação simples com CSS + setTimeout
    const spans = element.querySelectorAll('span');
    spans.forEach((span, index) => {
      setTimeout(() => {
        span.style.transition = 'opacity 0.3s ease';
        span.style.opacity = '1';
      }, index * 50); // 50ms entre cada letra
    });

  }, [isDarkMode]);

  return elementRef;
};
