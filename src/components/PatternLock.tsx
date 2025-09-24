"use client";

import { useState, useEffect, useRef } from 'react';

interface PatternLockProps {
  onPatternComplete: (pattern: number[]) => void;
  onPatternClear: () => void;
  value?: number[];
  disabled?: boolean;
  className?: string;
}

export default function PatternLock({ 
  onPatternComplete, 
  onPatternClear, 
  value = [], 
  disabled = false,
  className = ""
}: PatternLockProps) {
  const [selectedDots, setSelectedDots] = useState<number[]>(value);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Controlar hidratação
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redimensionar canvas quando necessário
  useEffect(() => {
    if (!isMounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Definir tamanho do canvas
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Definir tamanho CSS
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, rect.width, rect.height);
        drawPattern();
      }
    };

    // Usar ResizeObserver para detectar mudanças de tamanho
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    // Fallback para window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Desenhar inicial
    setTimeout(resizeCanvas, 100);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [selectedDots, isMounted]);

  // Desenhar o padrão
  const drawPattern = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Obter dimensões do canvas
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calcular dimensões responsivas
    const minDimension = Math.min(width, height);
    const padding = Math.max(20, minDimension * 0.15);
    const dotSize = Math.max(12, minDimension * 0.08);
    const dotSpacing = (minDimension - padding * 2) / 2;

    // Limpar canvas
    ctx.clearRect(0, 0, width, height);

    // Desenhar pontos
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = padding + col * dotSpacing;
        const y = padding + row * dotSpacing;
        const dotIndex = row * 3 + col;
        const isSelected = selectedDots.includes(dotIndex);

        // Círculo externo
        ctx.beginPath();
        ctx.arc(x, y, dotSize + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#3b82f6' : '#e5e7eb';
        ctx.fill();

        // Círculo interno
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#ffffff' : '#9ca3af';
        ctx.fill();

        // Ponto central se selecionado
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(3, dotSize * 0.3), 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        }
      }
    }

    // Desenhar linhas conectando os pontos
    if (selectedDots.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(2, dotSize * 0.2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < selectedDots.length - 1; i++) {
        const startDot = selectedDots[i];
        const endDot = selectedDots[i + 1];

        const startRow = Math.floor(startDot / 3);
        const startCol = startDot % 3;
        const endRow = Math.floor(endDot / 3);
        const endCol = endDot % 3;

        const startX = padding + startCol * dotSpacing;
        const startY = padding + startRow * dotSpacing;
        const endX = padding + endCol * dotSpacing;
        const endY = padding + endRow * dotSpacing;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
  };

  // Atualizar desenho quando selectedDots muda
  useEffect(() => {
    drawPattern();
  }, [selectedDots]);

  // Manipular clique/toque
  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    setSelectedDots([]);
    onPatternClear();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Usar as mesmas dimensões responsivas do drawPattern
    const width = rect.width;
    const height = rect.height;
    const minDimension = Math.min(width, height);
    const padding = Math.max(16, minDimension * 0.1);
    const dotSize = Math.max(8, minDimension * 0.05);
    const dotSpacing = (minDimension - padding * 2) / 2;
    const touchRadius = dotSize + 10; // Raio de toque responsivo

    // Verificar se está próximo de algum ponto
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const dotX = padding + col * dotSpacing;
        const dotY = padding + row * dotSpacing;
        const dotIndex = row * 3 + col;

        const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
        
        if (distance <= touchRadius && !selectedDots.includes(dotIndex)) {
          setSelectedDots(prev => [...prev, dotIndex]);
        }
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || disabled) return;
    setIsDrawing(false);
    
    if (selectedDots.length > 0) {
      onPatternComplete([...selectedDots]);
    }
  };

  // Limpar padrão
  const clearPattern = () => {
    setSelectedDots([]);
    onPatternClear();
  };

  if (!isMounted) {
    return (
      <div className={`relative ${className}`}>
        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
          <div className="w-full h-32 sm:h-40 md:h-44 lg:h-48 bg-gray-100 animate-pulse flex items-center justify-center">
            <span className="text-gray-400 text-sm">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-32 sm:h-40 md:h-44 lg:h-48 cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-2">
        <span className="text-xs text-gray-500 leading-relaxed">
          Desenhe o padrão de desbloqueio
        </span>
        {selectedDots.length > 0 && (
          <button
            onClick={clearPattern}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            disabled={disabled}
          >
            Limpar padrão
          </button>
        )}
      </div>
      
      {selectedDots.length > 0 && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <span className="font-medium">Padrão registrado:</span> {selectedDots.map((dot, index) => (
            <span key={index} className="font-mono">
              {Math.floor(dot / 3) + 1},{dot % 3 + 1}
              {index < selectedDots.length - 1 ? ' → ' : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
