'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// Importação dinâmica do ApexCharts para evitar problemas de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface EquipamentoData {
  equipamento: string;
  count: number;
  percentage: number;
}

interface ModernPieChartProps {
  className?: string;
}

export default function ModernPieChart({ className = '' }: ModernPieChartProps) {
  const [chartData, setChartData] = useState<EquipamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { empresaData } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && empresaData?.id) {
      fetchEquipamentoData();
    }
  }, [isMounted, empresaData?.id]);

  const fetchEquipamentoData = async () => {
    if (!empresaData?.id) return;
    
    try {
      // Calcular início e fim do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      console.log('📅 Buscando dados do mês:', {
        inicio: startOfMonth.toISOString(),
        fim: endOfMonth.toISOString()
      });

      const { data, error } = await supabase
        .from('ordens_servico')
        .select('equipamento, data_cadastro')
        .eq('empresa_id', empresaData.id)
        .not('equipamento', 'is', null)
        .gte('data_cadastro', startOfMonth.toISOString())
        .lte('data_cadastro', endOfMonth.toISOString());

      if (error) {
        console.error('Erro ao buscar dados dos equipamentos:', error);
        return;
      }

      console.log('📊 Dados encontrados:', data?.length || 0);

      // Processar dados para o gráfico
      const equipamentoCounts: { [key: string]: number } = {};
      data?.forEach(os => {
        if (os.equipamento && os.equipamento.trim() !== '') {
          equipamentoCounts[os.equipamento] = (equipamentoCounts[os.equipamento] || 0) + 1;
        }
      });

      const total = data?.length || 0;
      const processedData = Object.entries(equipamentoCounts).map(([equipamento, count]) => ({
        equipamento,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));

      // Ordenar por quantidade (maior primeiro)
      processedData.sort((a, b) => b.count - a.count);

      console.log('📈 Dados processados:', processedData);
      setChartData(processedData);
    } catch (error) {
      console.error('Erro ao processar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cores do gráfico
  const chartColors = [
    '#D1FE6E', // Verde principal
    '#B8E55A', // Verde médio
    '#A5D44A', // Verde escuro
    '#8BC34A', // Verde alternativo
    '#689F38', // Verde mais escuro
    '#4CAF50', // Verde padrão
    '#2E7D32', // Verde escuro
    '#1B5E20'  // Verde muito escuro
  ];

  // Configuração do gráfico
  const chartOptions = {
    chart: {
      type: 'donut' as const,
      height: 400,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    series: chartData.map(item => item.count),
    labels: chartData.map(item => item.equipamento),
    colors: chartColors,
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          background: 'transparent',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '14px',
              fontWeight: 600,
              color: '#ffffff',
              offsetY: -8,
              formatter: (val: string) => val
            },
            value: {
              show: true,
              fontSize: '20px',
              fontWeight: 700,
              color: '#D1FE6E',
              offsetY: 12,
              formatter: (val: string) => `${val}`
            },
            total: {
              show: true,
              showAlways: false,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
              formatter: () => {
                const total = chartData.reduce((sum, item) => sum + item.count, 0);
                return total.toString();
              }
            }
          }
        },
        expandOnClick: false,
        customScale: 1.0
      }
    },
    stroke: {
      show: true,
      width: 3,
      colors: ['#000000']
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      show: true,
      position: 'bottom' as const,
      horizontalAlign: 'center' as const,
      fontSize: '14px',
      fontWeight: 600,
      labels: {
        colors: '#ffffff',
        useSeriesColors: false
      },
      markers: {
        width: 14,
        height: 14,
        strokeWidth: 2,
        strokeColor: '#ffffff',
        radius: 3
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    tooltip: {
      enabled: true,
      theme: 'dark',
      style: {
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        color: '#ffffff'
      },
      fillSeriesColor: false,
      marker: {
        show: true,
        fillColors: chartColors
      },
      y: {
        formatter: (val: number, { seriesIndex }: any) => {
          const item = chartData[seriesIndex];
          return `${val} OS (${item?.percentage}%)`;
        }
      }
    },
    responsive: [{
      breakpoint: 768,
      options: {
        chart: {
          height: 300
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };

  if (!isMounted) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-8 border border-gray-700/50 backdrop-blur-xl">
          <div className="flex items-center justify-center h-96">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-[#D1FE6E] rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-[#B8E55A] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl p-8 border border-gray-700/50 backdrop-blur-xl">
          <div className="flex items-center justify-center h-96">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-[#D1FE6E] rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-[#B8E55A] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`relative ${className}`}
    >
      {/* Background com efeito de grid */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(209, 254, 110, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(209, 254, 110, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
        
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D1FE6E]/5 to-transparent animate-pulse"></div>
      </div>

      {/* Container principal */}
      <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-black/80 rounded-2xl p-8 border border-gray-700/50 backdrop-blur-xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-2xl font-bold text-white mb-2">
            Equipamentos por OS - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <p className="text-gray-400">
            Distribuição dos tipos de equipamentos nas OS do mês atual
          </p>
        </motion.div>

        {/* Layout com gráfico à esquerda e resumo à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Gráfico */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {chartData.length > 0 ? (
              <Chart
                options={chartOptions}
                series={chartOptions.series}
                type="donut"
                height={350}
              />
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Nenhum equipamento encontrado este mês</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Resumo das informações */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-6"
          >
            {/* Total de OS */}
            <div className="bg-gradient-to-r from-[#D1FE6E]/10 to-transparent border border-[#D1FE6E]/20 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-3 h-3 bg-[#D1FE6E] rounded-full"></div>
                <h4 className="text-lg font-semibold text-white">Total de OS</h4>
              </div>
              <p className="text-3xl font-bold text-[#D1FE6E]">
                {chartData.reduce((sum, item) => sum + item.count, 0)}
              </p>
              <p className="text-sm text-gray-400 mt-1">Ordens de serviço este mês</p>
            </div>

            {/* Lista de equipamentos */}
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-white mb-4">Equipamentos Atendidos</h4>
              {chartData.map((item, index) => (
                <motion.div
                  key={item.equipamento}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-[#D1FE6E]/50 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: chartColors[index] }}
                    ></div>
                    <span className="text-white font-medium">{item.equipamento}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#D1FE6E]">{item.count}</p>
                    <p className="text-xs text-gray-400">{item.percentage}%</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Estatísticas adicionais */}
            {chartData.length > 0 && (
              <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700">
                <h5 className="text-sm font-semibold text-gray-300 mb-3">Estatísticas</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Equipamento mais atendido</p>
                    <p className="text-white font-semibold">{chartData[0]?.equipamento}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total de tipos</p>
                    <p className="text-white font-semibold">{chartData.length}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Efeito de partículas flutuantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#D1FE6E] rounded-full opacity-30"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
            animate={{
              y: [-10, 10, -10],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}