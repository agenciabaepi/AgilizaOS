'use client';

import React from 'react';
import { HistoricoItem } from '@/hooks/useHistoricoOS';
import { 
  FiUser, 
  FiClock, 
  FiMessageSquare, 
  FiEdit, 
  FiImage, 
  FiDollarSign, 
  FiTruck, 
  FiSettings,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw
} from 'react-icons/fi';

interface HistoricoOSTimelineProps {
  historico: HistoricoItem[];
  loading?: boolean;
  compact?: boolean;
  showMetrics?: boolean;
}

export default function HistoricoOSTimeline({ 
  historico, 
  loading = false, 
  compact = false,
  showMetrics = true
}: HistoricoOSTimelineProps) {
  
  const getAcaoIcon = (acao: string, categoria: string) => {
    switch (categoria) {
      case 'STATUS':
        return <FiRefreshCw className="w-4 h-4" />;
      case 'DADOS':
        return <FiEdit className="w-4 h-4" />;
      case 'ANEXOS':
        return <FiImage className="w-4 h-4" />;
      case 'FINANCEIRO':
        return <FiDollarSign className="w-4 h-4" />;
      case 'ENTREGA':
        return <FiTruck className="w-4 h-4" />;
      case 'SISTEMA':
        return <FiSettings className="w-4 h-4" />;
      default:
        return <FiFileText className="w-4 h-4" />;
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'STATUS':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'DADOS':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'ANEXOS':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'FINANCEIRO':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'ENTREGA':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500'
        };
      case 'SISTEMA':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          dot: 'bg-gray-500'
        };
    }
  };

  const melhorarDescricao = (item: HistoricoItem) => {
    // Melhorar descrições confusas
    let descricao = item.descricao;
    
    // Limpar "N/A" desnecessários e melhorar formatação
    descricao = descricao
      .replace(/de "N\/A" para "/g, 'para "')
      .replace(/de "undefined" para "/g, 'para "')
      .replace(/de "" para "/g, 'para "')
      .replace(/de "null" para "/g, 'para "')
      .replace(/alterado de "N\/A"/g, 'definido')
      .replace(/alterado de "undefined"/g, 'definido')
      .replace(/alterado de ""/g, 'definido')
      .replace(/alterado de "null"/g, 'definido');
    
    // Se a descrição contém "undefined" ou outros problemas, tentar criar uma melhor
    if (descricao.includes('undefined') || descricao.includes('UPDATE_FIELDS')) {
      switch (item.categoria) {
        case 'STATUS':
          if (item.valor_anterior && item.valor_novo) {
            return `Status alterado de "${item.valor_anterior}" para "${item.valor_novo}"`;
          }
          return 'Status da OS foi alterado';
          
        case 'DADOS':
          return 'Dados da OS foram atualizados';
          
        case 'FINANCEIRO':
          if (item.valor_anterior && item.valor_novo) {
            return `Valor alterado de R$ ${item.valor_anterior} para R$ ${item.valor_novo}`;
          }
          return 'Valores financeiros foram alterados';
          
        case 'ANEXOS':
          return 'Imagem ou arquivo foi adicionado';
          
        case 'ENTREGA':
          return 'OS foi entregue ao cliente';
          
        case 'SISTEMA':
          return 'Ação realizada pelo sistema';
          
        default:
          return 'Alteração realizada na OS';
      }
    }
    
    return descricao;
  };

  const formatarData = (data: string) => {
    const date = new Date(data);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    const isHoje = date.toDateString() === hoje.toDateString();
    const isOntem = date.toDateString() === ontem.toDateString();

    if (isHoje) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isOntem) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderDetalhesLegivel = (item: HistoricoItem) => {
    // Mostrar apenas informações importantes de forma legível
    const infos = [];
    
    // Valor anterior → novo
    if (item.valor_anterior && item.valor_novo && item.valor_anterior !== item.valor_novo) {
      infos.push(`${item.campo_alterado || 'Valor'}: "${item.valor_anterior}" → "${item.valor_novo}"`);
    }
    
    // Se não tem valores específicos, tentar extrair do JSON de detalhes
    if (infos.length === 0 && item.detalhes) {
      try {
        const detalhes = typeof item.detalhes === 'string' 
          ? JSON.parse(item.detalhes) 
          : item.detalhes;
        
        // Extrair informações úteis do JSON
        Object.keys(detalhes).forEach(campo => {
          const mudanca = detalhes[campo];
          if (mudanca && typeof mudanca === 'object' && mudanca.anterior !== undefined && mudanca.novo !== undefined) {
            const valorAnterior = mudanca.anterior;
            const valorNovo = mudanca.novo;
            
            // Formatar valores de forma mais limpa
            const formatarValor = (valor: any) => {
              if (!valor || valor === 'undefined' || valor === 'null') return '(vazio)';
              if (typeof valor === 'string' && valor.trim() === '') return '(vazio)';
              return valor;
            };
            
            const anterior = formatarValor(valorAnterior);
            const novo = formatarValor(valorNovo);
            
            // Nomes mais amigáveis para os campos
            const nomesAmigaveis: Record<string, string> = {
              'status': 'Status',
              'status_tecnico': 'Status Técnico',
              'equipamento': 'Equipamento',
              'marca': 'Marca',
              'modelo': 'Modelo',
              'cor': 'Cor',
              'numero_serie': 'Número de Série',
              'problema_relatado': 'Problema Relatado',
              'laudo': 'Laudo Técnico',
              'servico': 'Serviço',
              'peca': 'Peça',
              'acessorios': 'Acessórios',
              'condicoes_equipamento': 'Condições do Equipamento',
              'observacao': 'Observações',
              'valor_faturado': 'Valor Faturado'
            };
            
            const nomeAmigavel = nomesAmigaveis[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            // Formatação especial para valores monetários
            if (campo === 'valor_faturado') {
              const valorAnteriorNum = parseFloat(valorAnterior) || 0;
              const valorNovoNum = parseFloat(valorNovo) || 0;
              infos.push(`${nomeAmigavel}: R$ ${valorAnteriorNum.toFixed(2)} → R$ ${valorNovoNum.toFixed(2)}`);
            } else {
              infos.push(`${nomeAmigavel}: "${anterior}" → "${novo}"`);
            }
          }
        });
        
        // Informações específicas para outros tipos
        if (detalhes.nomeArquivo) {
          infos.push(`Arquivo: ${detalhes.nomeArquivo}`);
        }
        
        if (detalhes.tipoImagem) {
          infos.push(`Tipo: ${detalhes.tipoImagem === 'cliente' ? 'Imagem do Cliente' : 'Imagem do Técnico'}`);
        }
        
        if (detalhes.dataEntrega) {
          infos.push(`Data de Entrega: ${new Date(detalhes.dataEntrega).toLocaleDateString('pt-BR')}`);
        }
      } catch (e) {
        // Se não conseguir processar, não mostrar nada
      }
    }
    
    if (infos.length === 0) return null;
    
    return (
      <div className="mt-2 text-xs text-gray-700 bg-white bg-opacity-70 rounded p-2 border-l-2 border-blue-300">
        {infos.map((info, index) => (
          <div key={index} className="flex items-center space-x-1">
            <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
            <span>{info}</span>
          </div>
        ))}
      </div>
    );
  };

  const calcularMetricas = () => {
    if (!showMetrics || historico.length === 0) return null;

    const hoje = new Date().toISOString().split('T')[0];
    const acoesHoje = historico.filter(item => 
      item.created_at.startsWith(hoje)
    ).length;

    const categorias = historico.reduce((acc, item) => {
      acc[item.categoria] = (acc[item.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoriaMaisComum = Object.entries(categorias)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    return { acoesHoje, categoriaMaisComum, totalAcoes: historico.length };
  };

  const metricas = calcularMetricas();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Ações</p>
                <p className="text-2xl font-bold text-gray-900">{metricas.totalAcoes}</p>
              </div>
              <FiFileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ações Hoje</p>
                <p className="text-2xl font-bold text-green-600">{metricas.acoesHoje}</p>
              </div>
              <FiClock className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categoria Mais Comum</p>
                <p className="text-lg font-bold text-purple-600">{metricas.categoriaMaisComum}</p>
              </div>
              <FiAlertCircle className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {historico.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FiFileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma ação registrada ainda</h3>
          <p className="text-gray-600 text-sm">
            O histórico será criado automaticamente quando você fizer alterações na OS.
            <br />
            <span className="text-xs text-gray-500 mt-1 block">
              (Mudanças de status, valores, observações, etc.)
            </span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {historico.map((item, index) => {
            const colors = getCategoriaColor(item.categoria);
            const isLast = index === historico.length - 1;

            return (
              <div key={item.id} className="relative">
                {/* Linha conectora */}
                {!isLast && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                )}
                
                <div className="flex items-start space-x-4">
                  {/* Ícone da ação */}
                  <div className={`
                    flex-shrink-0 w-12 h-12 rounded-full border-2 ${colors.border} ${colors.bg} 
                    flex items-center justify-center relative z-10
                  `}>
                    <div className={colors.text}>
                      {getAcaoIcon(item.acao, item.categoria)}
                    </div>
                  </div>

                  {/* Conteúdo */}
                  <div className={`
                    flex-1 min-w-0 p-4 rounded-lg border ${colors.border} ${colors.bg}
                    ${compact ? 'py-2' : 'py-4'}
                  `}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Título da ação */}
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`
                            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${colors.bg} ${colors.text} border ${colors.border}
                          `}>
                            {item.categoria}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.acao.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>

                        {/* Descrição */}
                        <p className={`text-sm font-medium ${colors.text} mb-2`}>
                          {melhorarDescricao(item)}
                        </p>

                        {/* Informações adicionais */}
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <FiUser className="w-3 h-3" />
                            <span>{item.usuario_nome || 'Sistema'}</span>
                            {item.usuario_tipo && (
                              <span className="text-gray-400">({item.usuario_tipo})</span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <FiClock className="w-3 h-3" />
                            <span>{formatarData(item.created_at)}</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        {item.motivo && (
                          <div className="mt-2 flex items-start space-x-1">
                            <FiMessageSquare className="w-3 h-3 mt-0.5 text-gray-400" />
                            <span className="text-xs text-gray-600">{item.motivo}</span>
                          </div>
                        )}

                        {/* Observações */}
                        {item.observacoes && (
                          <div className="mt-2 text-xs text-gray-600 bg-white bg-opacity-50 rounded p-2">
                            <strong>Observações:</strong> {item.observacoes}
                          </div>
                        )}

                        {/* Detalhes importantes */}
                        {!compact && renderDetalhesLegivel(item)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
