'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchChecklistItensMerged } from '@/lib/checklist-client';
import {
  type ChecklistData,
  formatChecklistItemLabel,
  isChecklistItemAnswered,
  isChecklistItemFail,
  isChecklistItemOk,
} from '@/lib/checklist-values';
import { FiCheck, FiX } from 'react-icons/fi';

interface ChecklistItem {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  ativo: boolean;
  ordem: number;
  obrigatorio: boolean;
}

export type { ChecklistData };

export interface ValidationResult {
  isValid: boolean;
  missingItems: ChecklistItem[];
  message?: string;
}

interface DynamicChecklistProps {
  value?: ChecklistData;
  onChange?: (checklist: ChecklistData) => void;
  disabled?: boolean;
  showAparelhoNaoLiga?: boolean;
  equipamentoCategoria?: string;
  /** ID em equipamentos_tipos_catalogo — melhora o match com itens do admin SaaS */
  tipoCatalogoId?: string | null;
  onValidationChange?: (validation: ValidationResult) => void;
}

export default function DynamicChecklist({ 
  value = {}, 
  onChange, 
  disabled = false,
  showAparelhoNaoLiga = true,
  equipamentoCategoria,
  tipoCatalogoId,
  onValidationChange
}: DynamicChecklistProps) {
  const { empresaData, session } = useAuth();
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aparelhoNaoLiga, setAparelhoNaoLiga] = useState(false);
  const [checklistData, setChecklistData] = useState<ChecklistData>(value);

  // Carregar itens de checklist da empresa
  useEffect(() => {
    const fetchItens = async () => {
      if (!empresaData?.id) {
        setLoading(false);
        return;
      }

      try {
        const merged = await fetchChecklistItensMerged({
          empresaId: empresaData.id,
          session,
          equipamentoCategoria,
          tipoCatalogoId,
        });
        // "Aparelho não liga" tem controle próprio no topo (não duplicar item da lista padrão)
        setItens(
          merged.filter((i) => i.nome.trim().toLowerCase() !== 'aparelho não liga')
        );
      } catch (error) {
        console.error('Erro ao carregar itens de checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItens();
  }, [empresaData?.id, equipamentoCategoria, tipoCatalogoId, session?.access_token]);

  // Atualizar estado interno quando value prop muda
  useEffect(() => {
    setChecklistData(value);
    setAparelhoNaoLiga(value.aparelhoNaoLiga || false);
  }, [value]);

  // Agrupar itens por categoria
  const itensPorCategoria = itens.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  // Ordenar itens dentro de cada categoria
  Object.keys(itensPorCategoria).forEach(categoria => {
    itensPorCategoria[categoria].sort((a, b) => a.ordem - b.ordem);
  });

  const handleItemStatus = (itemId: string, funciona: boolean) => {
    const newData = { ...checklistData, [itemId]: funciona };
    setChecklistData(newData);
    onChange?.(newData);
  };

  const handleAparelhoNaoLigaChange = (checked: boolean) => {
    setAparelhoNaoLiga(checked);
    const newData = { ...checklistData, aparelhoNaoLiga: checked };
    
    // Se "Aparelho não liga" for marcado, desmarcar todos os outros itens
    if (checked) {
      Object.keys(checklistData).forEach(key => {
        if (key !== 'aparelhoNaoLiga') {
          newData[key] = false;
        }
      });
    }
    
    setChecklistData(newData);
    onChange?.(newData);
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      'geral': 'Geral',
      'audio': 'Áudio',
      'video': 'Vídeo',
      'conectividade': 'Conectividade',
      'hardware': 'Hardware',
      'seguranca': 'Segurança',
      'energia': 'Energia',
      'display': 'Display'
    };
    return labels[categoria] || categoria;
  };

  // Função de validação para itens obrigatórios
  const validateChecklist = (): ValidationResult => {
    if (aparelhoNaoLiga) {
      return {
        isValid: true,
        missingItems: [],
        message: 'Validação dispensada - aparelho não liga'
      };
    }

    const itensObrigatorios = itens.filter(item => item.obrigatorio && item.ativo);
    const itensFaltando = itensObrigatorios.filter(
      (item) => !isChecklistItemAnswered(checklistData, item.id)
    );

    return {
      isValid: itensFaltando.length === 0,
      missingItems: itensFaltando,
      message: itensFaltando.length > 0
        ? `${itensFaltando.length} item(ns) obrigatório(s) sem resposta (escolha Funciona ou Não funciona)`
        : 'Todos os itens obrigatórios foram respondidos',
    };
  };

  // Monitorar mudanças e validar
  useEffect(() => {
    if (onValidationChange) {
      const validation = validateChecklist();
      onValidationChange(validation);
    }
  }, [checklistData, aparelhoNaoLiga, itens, onValidationChange]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!empresaData?.id) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">
          Erro: Empresa não identificada. Não é possível carregar o checklist.
        </p>
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 text-sm">
          {equipamentoCategoria 
            ? `Nenhum item de checklist configurado para a categoria "${equipamentoCategoria}". Configure os itens em Configurações → Checklist por Categoria.`
            : `Nenhum item de checklist configurado para esta empresa. Configure os itens em Configurações → Checklist ou Checklist por Categoria.`
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!aparelhoNaoLiga && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">Como responder</p>
          <p className="mt-1 text-blue-800 text-xs leading-relaxed">
            Para cada item testado na recepção, escolha <strong>Funciona</strong> ou{' '}
            <strong>Não funciona</strong>. Itens com <span className="text-red-600 font-semibold">*</span>{' '}
            precisam de uma das duas opções.
          </p>
        </div>
      )}

      {/* Aparelho não liga - sempre no topo */}
      {showAparelhoNaoLiga && (
        <div className="border-b pb-4">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aparelhoNaoLiga}
                onChange={(e) => handleAparelhoNaoLigaChange(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-red-600">
                Aparelho não liga
              </span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Marque esta opção se o aparelho não liga. Os demais testes não poderão ser realizados.
          </p>
        </div>
      )}

      {/* Itens de checklist por categoria */}
      {!aparelhoNaoLiga && Object.keys(itensPorCategoria).map(categoria => (
        <div key={categoria} className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            {getCategoriaLabel(categoria)}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {itensPorCategoria[categoria].map((item) => {
              const ok = isChecklistItemOk(checklistData, item.id);
              const fail = isChecklistItemFail(checklistData, item.id);
              const label = formatChecklistItemLabel(item.nome);

              return (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="mb-2">
                    <span className="text-sm font-medium text-gray-800">
                      {label}
                      {item.obrigatorio && (
                        <span className="ml-1 text-xs text-red-500 font-semibold">*</span>
                      )}
                    </span>
                    {item.descricao && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={disabled || aparelhoNaoLiga}
                      onClick={() => handleItemStatus(item.id, true)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        ok
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-green-400 hover:text-green-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FiCheck size={14} />
                      Funciona
                    </button>
                    <button
                      type="button"
                      disabled={disabled || aparelhoNaoLiga}
                      onClick={() => handleItemStatus(item.id, false)}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        fail
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FiX size={14} />
                      Não funciona
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Mensagem quando aparelho não liga */}
      {aparelhoNaoLiga && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <FiX className="text-red-500" size={20} />
            <div>
              <p className="text-red-700 font-medium text-sm">
                Checklist não pode ser realizado
              </p>
              <p className="text-red-600 text-xs mt-1">
                Como o aparelho não liga, não é possível realizar os testes para verificar quais componentes estão funcionando. 
                Após o técnico conseguir fazer o aparelho ligar (caso tenha conserto), será realizado o checklist completo 
                para verificar quais componentes estão ou não funcionando.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validação de itens obrigatórios */}
      {!aparelhoNaoLiga && (() => {
        const validation = validateChecklist();
        const itensObrigatorios = itens.filter(item => item.obrigatorio && item.ativo);
        
        return (
          <div className="space-y-3">
            {/* Resumo dos itens obrigatórios */}
            <div className="text-xs text-gray-500">
              <p>
                * Obrigatórios ({itensObrigatorios.length}): responda Funciona ou Não funciona em cada um
              </p>
            </div>

            {/* Alerta de validação */}
            {validation.missingItems.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <FiX className="text-yellow-500 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="text-yellow-800 font-medium text-sm">
                      Itens obrigatórios sem resposta
                    </p>
                    <p className="text-yellow-700 text-xs mt-1">
                      {validation.message}
                    </p>
                    <div className="mt-2 space-y-1">
                      {validation.missingItems.map(item => (
                        <div key={item.id} className="text-xs text-yellow-700">
                          • {item.nome} ({getCategoriaLabel(item.categoria)})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmação de validação */}
            {validation.isValid && itensObrigatorios.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FiCheck className="text-green-500" size={16} />
                  <p className="text-green-800 font-medium text-sm">
                    Todos os itens obrigatórios foram respondidos
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
