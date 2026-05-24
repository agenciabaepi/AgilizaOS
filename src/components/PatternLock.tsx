"use client";

import { useState, useEffect, useRef } from 'react';

interface PatternLockProps {
  onPatternComplete: (pattern: number[]) => void;
  onPatternClear: () => void;
  value?: number[];
  disabled?: boolean;
  className?: string;
  /** Esconde o bloco "Padrão registrado" com as coordenadas. Útil em formulários compactos. */
  showCoordinates?: boolean;
  /** Centraliza grade e textos (mobile / formulários estreitos) */
  centered?: boolean;
}

interface PatternGeometry {
  offsetX: number;
  offsetY: number;
  innerPad: number;
  dotSpacing: number;
  dotSize: number;
  touchRadius: number;
}

function computePatternGeometry(width: number, height: number): PatternGeometry {
  const gridSide = Math.min(width, height) * 0.88;
  const innerPad = gridSide * 0.12;
  const dotSpacing = (gridSide - innerPad * 2) / 2;
  const dotSize = Math.max(10, gridSide * 0.07);
  return {
    offsetX: (width - gridSide) / 2,
    offsetY: (height - gridSide) / 2,
    innerPad,
    dotSpacing,
    dotSize,
    touchRadius: dotSize + 12,
  };
}

function dotPosition(geom: PatternGeometry, row: number, col: number) {
  return {
    x: geom.offsetX + geom.innerPad + col * geom.dotSpacing,
    y: geom.offsetY + geom.innerPad + row * geom.dotSpacing,
  };
}

export default function PatternLock({ 
  onPatternComplete, 
  onPatternClear, 
  value = [], 
  disabled = false,
  className = '',
  showCoordinates = true,
  centered = false,
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
    const geom = computePatternGeometry(width, height);

    ctx.clearRect(0, 0, width, height);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const { x, y } = dotPosition(geom, row, col);
        const dotIndex = row * 3 + col;
        const isSelected = selectedDots.includes(dotIndex);

        ctx.beginPath();
        ctx.arc(x, y, geom.dotSize + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#3b82f6' : '#e5e7eb';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, geom.dotSize, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#ffffff' : '#9ca3af';
        ctx.fill();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(3, geom.dotSize * 0.3), 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
        }
      }
    }

    if (selectedDots.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = Math.max(2, geom.dotSize * 0.2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < selectedDots.length - 1; i++) {
        const startDot = selectedDots[i];
        const endDot = selectedDots[i + 1];
        const start = dotPosition(geom, Math.floor(startDot / 3), startDot % 3);
        const end = dotPosition(geom, Math.floor(endDot / 3), endDot % 3);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
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
    const geom = computePatternGeometry(rect.width, rect.height);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const { x: dotX, y: dotY } = dotPosition(geom, row, col);
        const dotIndex = row * 3 + col;
        const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);

        if (distance <= geom.touchRadius && !selectedDots.includes(dotIndex)) {
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
      <div className={`relative w-full ${centered ? 'mx-auto' : ''} ${className}`}>
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
          <div
            className={`flex w-full items-center justify-center bg-gray-100 animate-pulse ${
              centered ? 'aspect-square max-h-[220px]' : 'h-32 sm:h-40 md:h-44 lg:h-48'
            }`}
          >
            <span className="text-gray-400 text-sm">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${centered ? 'mx-auto' : ''} ${className}`}>
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className={`w-full cursor-pointer ${
            centered ? 'aspect-square max-h-[220px]' : 'h-32 sm:h-40 md:h-44 lg:h-48'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>
      
      <div
        className={`mt-2 flex gap-2 ${
          centered
            ? 'flex-col items-center text-center'
            : 'flex-col items-start sm:flex-row sm:items-center sm:justify-between'
        }`}
      >
        <span className="text-xs leading-relaxed text-gray-500">
          Desenhe o padrão de desbloqueio
        </span>
        {selectedDots.length > 0 && (
          <button
            onClick={clearPattern}
            className="rounded px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800"
            disabled={disabled}
            type="button"
          >
            Limpar padrão
          </button>
        )}
      </div>
      
      {showCoordinates && selectedDots.length > 0 && (
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
