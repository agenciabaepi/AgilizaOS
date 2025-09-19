'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChartData {
  date: string;
  value: number;
  label: string;
}

interface ModernChartProps {
  data: ChartData[];
  title: string;
  subtitle?: string;
  value?: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
}

export default function ModernChart({
  data,
  title,
  subtitle,
  value,
  change,
  changeType = 'positive',
  selectedPeriod = '7D',
  onPeriodChange
}: ModernChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ChartData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const periods = ['1D', '7D', '1M', '3M', 'ALL'];

  // Calcular dimensões do gráfico
  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };

  // Encontrar valores min/max
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;

  // Função para converter valor para coordenada Y
  const getY = (value: number) => {
    return height - padding.bottom - ((value - minValue) / valueRange) * (height - padding.top - padding.bottom);
  };

  // Função para converter índice para coordenada X
  const getX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * (width - padding.left - padding.right);
  };

  // Gerar path da linha
  const createPath = () => {
    if (data.length < 2) return '';
    
    let path = `M ${getX(0)} ${getY(data[0].value)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].value);
      path += ` L ${x} ${y}`;
    }
    
    return path;
  };

  // Gerar path da área
  const createAreaPath = () => {
    if (data.length < 2) return '';
    
    let path = `M ${getX(0)} ${height - padding.bottom}`;
    path += ` L ${getX(0)} ${getY(data[0].value)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = getX(i);
      const y = getY(data[i].value);
      path += ` L ${x} ${y}`;
    }
    
    path += ` L ${getX(data.length - 1)} ${height - padding.bottom} Z`;
    
    return path;
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setMousePosition({ x, y });
    
    // Encontrar ponto mais próximo
    let closestPoint = data[0];
    let minDistance = Math.abs(x - getX(0));
    
    for (let i = 1; i < data.length; i++) {
      const distance = Math.abs(x - getX(i));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = data[i];
      }
    }
    
    setHoveredPoint(closestPoint);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
            {value && (
              <div className="mt-2">
                <span className="text-3xl font-bold text-gray-900">{value}</span>
                {change && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`ml-3 px-2 py-1 rounded-full text-sm font-medium ${
                      changeType === 'positive' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {changeType === 'positive' ? '▲' : '▼'} {change}
                  </motion.span>
                )}
              </div>
            )}
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {periods.map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange?.(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-6 pb-6">
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
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Area */}
            <motion.path
              d={createAreaPath()}
              fill="url(#areaGradient)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            
            {/* Line */}
            <motion.path
              d={createPath()}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            />
            
            {/* Data Points */}
            {data.map((point, index) => (
              <motion.circle
                key={index}
                cx={getX(index)}
                cy={getY(point.value)}
                r="4"
                fill="#10b981"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
              />
            ))}
            
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
            {[minValue, (minValue + maxValue) / 2, maxValue].map((value, index) => (
              <text
                key={index}
                x={padding.left - 10}
                y={getY(value) + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </text>
            ))}
            
            {/* X Axis Labels */}
            {data.map((point, index) => {
              if (index % Math.ceil(data.length / 6) === 0) {
                return (
                  <text
                    key={index}
                    x={getX(index)}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {point.label}
                  </text>
                );
              }
              return null;
            })}
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
                  top: `${(getY(hoveredPoint.value) / height) * 100}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">
                    {hoveredPoint.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {hoveredPoint.date}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
