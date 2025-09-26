'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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

interface ChecklistData {
  [key: string]: boolean;
}

interface DynamicChecklistProps {
  value?: ChecklistData;
  onChange?: (checklist: ChecklistData) => void;
  disabled?: boolean;
  showAparelhoNaoLiga?: boolean;
}

export default function DynamicChecklist({ 
  value = {}, 
  onChange, 
  disabled = false,
  showAparelhoNaoLiga = true 
}: DynamicChecklistProps) {
  const { empresaData } = useAuth();
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
        const response = await fetch(`/api/checklist-itens?empresa_id=${empresaData.id}&ativo=true`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          setItens(data.itens || []);
        } else {
          console.error('Erro ao carregar itens de checklist:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao carregar itens de checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItens();
  }, [empresaData?.id]);

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

  const handleItemChange = (itemId: string, checked: boolean) => {
    const newData = { ...checklistData, [itemId]: checked };
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
          Nenhum item de checklist configurado para esta empresa. 
          Configure os itens em <strong>Configurações → Checklist</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            {itensPorCategoria[categoria].map(item => (
              <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <label className="flex items-center space-x-2 cursor-pointer flex-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={checklistData[item.id] || false}
                      onChange={(e) => handleItemChange(item.id, e.target.checked)}
                      disabled={disabled || aparelhoNaoLiga}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-colors ${
                      checklistData[item.id] 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    } ${disabled || aparelhoNaoLiga ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {checklistData[item.id] && <FiCheck size={14} />}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      checklistData[item.id] ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {item.nome}
                    </span>
                    {item.obrigatorio && (
                      <span className="ml-2 text-xs text-red-500 font-semibold">*</span>
                    )}
                    {item.descricao && (
                      <p className="text-xs text-gray-500 mt-1">{item.descricao}</p>
                    )}
                  </div>
                </label>
              </div>
            ))}
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

      {/* Resumo dos itens obrigatórios */}
      {!aparelhoNaoLiga && (
        <div className="text-xs text-gray-500">
          <p>* Itens marcados com asterisco são obrigatórios</p>
        </div>
      )}
    </div>
  );
}
