'use client';

import { useEffect, useState } from 'react';

interface ParallaxOptions {
  speed?: number; // Velocidade do movimento (0-1)
  scale?: number; // Fator de escala
  direction?: 'up' | 'down' | 'left' | 'right';
  fade?: boolean; // Se deve fazer fade in/out
  rotate?: number; // Rotação em graus
}

export function useParallax(options: ParallaxOptions = {}) {
  const {
    speed = 0.5,
    scale = 1,
    direction = 'up',
    fade = false,
    rotate = 0
  } = options;

  const [scrollY, setScrollY] = useState(0);
  const [elementRect, setElementRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getTransform = (element: HTMLElement | null) => {
    if (!element) return {};

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + scrollY;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;
    
    // Calcula a progressão do elemento na tela (0 a 1)
    const progress = Math.max(0, Math.min(1, 
      (scrollY - elementTop + windowHeight) / (windowHeight + elementHeight)
    ));

    // Calcula o movimento baseado na direção
    let translateX = 0;
    let translateY = 0;
    
    const movement = (progress - 0.5) * 100 * speed;
    
    switch (direction) {
      case 'up':
        translateY = movement;
        break;
      case 'down':
        translateY = -movement;
        break;
      case 'left':
        translateX = movement;
        break;
      case 'right':
        translateX = -movement;
        break;
    }

    // Calcula o zoom baseado no progresso
    const zoomProgress = Math.sin(progress * Math.PI);
    const currentScale = 1 + (scale - 1) * zoomProgress;

    // Calcula a rotação
    const rotationProgress = progress * 360;
    const currentRotation = rotate * (progress - 0.5);

    // Calcula a opacidade se fade estiver ativo
    const opacity = fade ? Math.min(1, progress * 2) : 1;

    return {
      transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentScale}) rotate(${currentRotation}deg)`,
      opacity,
      willChange: 'transform, opacity'
    };
  };

  return {
    scrollY,
    getTransform,
    isVisible
  };
}

// Hook específico para efeitos Apple-style
export function useAppleParallax() {
  const [scrollY, setScrollY] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    
    setWindowHeight(window.innerHeight);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Efeito de zoom suave no hero
  const getHeroTransform = () => {
    const maxScroll = windowHeight * 0.6;
    const scrollProgress = Math.min(scrollY / maxScroll, 1);
    
    const scale = 1 + scrollProgress * 0.05; // Zoom reduzido para 5%
    const translateY = scrollProgress * 25; // Movimento vertical reduzido
    
    return {
      transform: `scale(${scale}) translateY(${translateY}px)`,
      willChange: 'transform'
    };
  };

  // Efeito parallax para elementos de fundo
  const getBackgroundTransform = (speed: number = 0.5) => {
    const translateY = scrollY * speed;
    
    return {
      transform: `translate3d(0, ${translateY}px, 0)`,
      willChange: 'transform'
    };
  };

  // Efeito de fade e movimento para seções
  const getSectionTransform = (element: HTMLElement | null) => {
    if (!element) return {};

    const rect = element.getBoundingClientRect();
    const elementTop = rect.top;
    const elementHeight = rect.height;
    
    // Calcula quando o elemento está visível - muito mais cedo
    const isInView = elementTop < windowHeight * 1.5 && elementTop > -elementHeight * 2;
    
    if (!isInView) return {};

    // Progresso muito mais antecipado - começa a aparecer quando ainda está longe
    const progress = Math.max(0, Math.min(1, 
      (windowHeight * 1.5 - elementTop) / (windowHeight * 2 + elementHeight)
    ));

    // Efeito de fade in muito mais rápido e antecipado
    const opacity = Math.min(1, progress * 2.5);
    
    // Efeito de movimento mais sutil
    const translateY = (1 - progress) * 10;
    
    // Efeito de escala mais sutil
    const scale = 0.99 + (progress * 0.01);

    return {
      opacity,
      transform: `translateY(${translateY}px) scale(${scale})`,
      willChange: 'transform, opacity'
    };
  };

  return {
    scrollY,
    getHeroTransform,
    getBackgroundTransform,
    getSectionTransform
  };
}
