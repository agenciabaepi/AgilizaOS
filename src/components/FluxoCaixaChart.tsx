'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FluxoCaixaData {
  mes: string;
  entradas: number;
  saidas: number;
  saldo_periodo: number;
  saldo_final: number;
  situacao: 'realizado' | 'previsto';
}

interface FluxoCaixaChartProps {
  data: FluxoCaixaData[];
  title?: string;
  mesSelecionado?: number;
}

export default function FluxoCaixaChart({ data, title = "Fluxo de Caixa - Mensal", mesSelecionado }: FluxoCaixaChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<FluxoCaixaData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Calcular dimensões do gráfico
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">{title}</h2>
        <div className="h-64 md:h-80 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">Nenhum dado disponível</p>
          </div>
        </div>
      </div>
    );
  }

  // Encontrar valores min/max para escala
  const allValues = data.flatMap(d => [d.entradas, d.saidas, d.saldo_final]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;

  // Função para converter valor para coordenada Y
  const getY = (value: number) => {
    if (valueRange === 0) return height / 2;
    return height - padding.bottom - ((value - minValue) / valueRange) * (height - padding.top - padding.bottom);
  };

  // Função para converter índice para coordenada X
  const getX = (index: number) => {
    const barWidth = (width - padding.left - padding.right) / data.length;
    return padding.left + (index * barWidth) + (barWidth / 2);
  };

  // Função para obter largura da barra
  const getBarWidth = () => {
    return (width - padding.left - padding.right) / data.length * 0.6;
  };

  // Gerar path da linha do saldo final
  const createSaldoPath = () => {
    if (data.length < 2) return '';
    
    let path = `M ${getX(0)} ${getY(data[0].saldo_final)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].saldo_final);
      path += ` L ${x} ${y}`;
    }
    
    return path;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setMousePosition({ x, y });
    
    // Encontrar ponto mais próximo
    let closestIndex = 0;
    let minDistance = Math.abs(x - getX(0));
    
    for (let i = 1; i < data.length; i++) {
      const distance = Math.abs(x - getX(i));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    setHoveredPoint(data[closestIndex]);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Gerar labels do eixo Y
  const generateYLabels = () => {
    const labels = [];
    const step = valueRange / 5;
    
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (step * i);
      labels.push(value);
    }
    
    return labels;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMes = (mes: string) => {
    // Converter "janeiro 2025" para "Jan - 25"
    const [mesNome, ano] = mes.split(' ');
    const mesAbrev = mesNome.substring(0, 3);
    const anoAbrev = ano.substring(2);
    return `${mesAbrev.charAt(0).toUpperCase() + mesAbrev.slice(1)} - ${anoAbrev}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-3 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>Entradas previstas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span>Entradas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span>Saídas previstas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>Saídas</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-200 rounded"></div>
            <span>Saldo final previsto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-600 rounded"></div>
            <span>Saldo final</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid Lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
            <linearGradient id="entradasGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.4"/>
            </linearGradient>
            <linearGradient id="saidasGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4"/>
            </linearGradient>
          </defs>
          
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Barras de Entradas */}
          {data.map((point, index) => {
            const x = getX(index);
            const barWidth = getBarWidth();
            const barHeight = Math.abs(getY(point.entradas) - getY(0));
            const y = getY(Math.max(0, point.entradas));
            const isSelected = mesSelecionado !== undefined && index === mesSelecionado;
            
            return (
              <motion.rect
                key={`entradas-${index}`}
                x={x - barWidth/2}
                y={y}
                width={barWidth * 0.4}
                height={barHeight}
                fill={isSelected ? "#10b981" : "url(#entradasGradient)"}
                stroke={isSelected ? "#059669" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                initial={{ height: 0, y: getY(0) }}
                animate={{ height: barHeight, y: y }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
              />
            );
          })}
          
          {/* Barras de Saídas */}
          {data.map((point, index) => {
            const x = getX(index);
            const barWidth = getBarWidth();
            const barHeight = Math.abs(getY(point.saidas) - getY(0));
            const y = getY(Math.max(0, point.saidas));
            const isSelected = mesSelecionado !== undefined && index === mesSelecionado;
            
            return (
              <motion.rect
                key={`saidas-${index}`}
                x={x + barWidth/2 - barWidth * 0.4}
                y={y}
                width={barWidth * 0.4}
                height={barHeight}
                fill={isSelected ? "#ef4444" : "url(#saidasGradient)"}
                stroke={isSelected ? "#dc2626" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                initial={{ height: 0, y: getY(0) }}
                animate={{ height: barHeight, y: y }}
                transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
              />
            );
          })}
          
          {/* Linha do Saldo Final */}
          <motion.path
            d={createSaldoPath()}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
          />
          
          {/* Pontos da linha do saldo final */}
          {data.map((point, index) => {
            const isSelected = mesSelecionado !== undefined && index === mesSelecionado;
            
            return (
              <motion.circle
                key={`saldo-${index}`}
                cx={getX(index)}
                cy={getY(point.saldo_final)}
                r={isSelected ? "6" : "4"}
                fill={isSelected ? "#7c3aed" : "#8b5cf6"}
                stroke={isSelected ? "#5b21b6" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.8 }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
              />
            );
          })}
          
          {/* Hover Line */}
          <AnimatePresence>
            {hoveredPoint && (
              <motion.line
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                x1={getX(data.indexOf(hoveredPoint))}
                y1={padding.top}
                x2={getX(data.indexOf(hoveredPoint))}
                y2={height - padding.bottom}
                stroke="#6b7280"
                strokeWidth="1"
                strokeDasharray="5,5"
              />
            )}
          </AnimatePresence>
          
          {/* Y Axis Labels */}
          {generateYLabels().map((value, index) => (
            <text
              key={index}
              x={padding.left - 10}
              y={getY(value) + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {formatCurrency(value)}
            </text>
          ))}
          
          {/* X Axis Labels */}
          {data.map((point, index) => (
            <text
              key={index}
              x={getX(index)}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {formatMes(point.mes)}
            </text>
          ))}
        </svg>
        
        {/* Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-3 pointer-events-none z-10"
              style={{
                left: `${(getX(data.indexOf(hoveredPoint)) / width) * 100}%`,
                top: `${(getY(hoveredPoint.saldo_final) / height) * 100}%`,
                transform: 'translate(-50%, -100%)'
              }}
            >
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">
                  {hoveredPoint.mes}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Entradas: {formatCurrency(hoveredPoint.entradas)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Saídas: {formatCurrency(hoveredPoint.saidas)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-xs text-gray-600">
                    Saldo: {formatCurrency(hoveredPoint.saldo_final)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
