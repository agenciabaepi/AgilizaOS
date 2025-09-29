import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar o ScrollTrigger
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface UseGSAPTextAnimationProps {
  isDarkMode: boolean;
}

export const useGSAPTextAnimation = ({ isDarkMode }: UseGSAPTextAnimationProps) => {
  const elementRef = useRef<any>(null);

  useEffect(() => {
    if (!elementRef.current || typeof window === 'undefined') return;

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

      // Aplicar estilos condicionais baseados no tema
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.fontWeight = '700';
      
      // Cores condicionais - usar gradiente no modo escuro, cor sólida no modo claro
      if (isDarkMode) {
        // No modo escuro, manter o gradiente CSS original
        span.style.color = 'inherit';
      } else {
        span.style.color = '#1f2937'; // gray-800 para modo claro
      }

      // Tamanhos responsivos
      if (window.innerWidth <= 600) {
        span.style.fontSize = '28px';
      } else {
        span.style.fontSize = '48px';
      }

      element.appendChild(span);
    });

    const spans = element.querySelectorAll('span');

    // Configurar animação GSAP
    gsap.fromTo(spans,
      { opacity: 0 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.03,
        scrollTrigger: {
          trigger: element,
          start: "top 65%",
          end: "bottom 45%",
          scrub: true,
          once: false,
        }
      }
    );

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [isDarkMode]);

  return elementRef;
};
