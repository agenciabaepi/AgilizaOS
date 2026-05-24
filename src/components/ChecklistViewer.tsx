'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchChecklistItensMerged } from '@/lib/checklist-client';
import { formatChecklistItemLabel, partitionChecklistItens } from '@/lib/checklist-values';
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

interface ChecklistViewerProps {
  checklistData: string | null;
  equipamentoCategoria?: string;
  tipoCatalogoId?: string | null;
}

export default function ChecklistViewer({
  checklistData,
  equipamentoCategoria,
  tipoCatalogoId,
}: ChecklistViewerProps) {
  const { empresaData, session } = useAuth();
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

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
        setItens(merged);
      } catch (error) {
        console.error('Erro ao carregar itens de checklist:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItens();
  }, [empresaData?.id, equipamentoCategoria, tipoCatalogoId, session?.access_token]);

  if (!checklistData) return null;

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-red-500 rounded flex items-center justify-center bg-red-50">
              <span className="text-red-600 font-bold text-xs leading-none">×</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-800">Aparelho não liga</h4>
              <p className="text-sm text-red-700 mt-1">
                Como o aparelho não liga, não é possível realizar o checklist para verificar quais funcionalidades estão operacionais. Após o técnico conseguir fazer o aparelho ligar (caso tenha conserto), será realizado o checklist completo para identificar quais componentes estão ou não funcionando.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="space-y-3">
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

    if (itens.length === 0) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700 text-sm">
            {equipamentoCategoria 
              ? `Nenhum item de checklist configurado para a categoria "${equipamentoCategoria}".`
              : `Nenhum item de checklist configurado para esta empresa.`
            }
          </p>
        </div>
      );
    }

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

    const allItens = Object.values(itensPorCategoria).flat();
    const { ok: itensAprovados, fail: itensReprovados, unanswered: itensSemResposta } =
      partitionChecklistItens(allItens, checklist);

    return (
      <div className="space-y-4">
        {itensAprovados.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-3">Funciona</h4>
            <div className="grid grid-cols-2 gap-2">
              {itensAprovados.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-green-600">
                  <div className="w-4 h-4 border-2 border-green-500 rounded flex items-center justify-center bg-green-50">
                    <FiCheck className="w-3 h-3 text-green-600" />
                  </div>
                  <span>{formatChecklistItemLabel(item.nome)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itensReprovados.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-3">Não funciona</h4>
            <div className="grid grid-cols-2 gap-2">
              {itensReprovados.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-red-500">
                  <div className="w-4 h-4 border-2 border-red-500 rounded flex items-center justify-center bg-red-50">
                    <FiX className="w-3 h-3 text-red-600" />
                  </div>
                  <span>{formatChecklistItemLabel(item.nome)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itensSemResposta.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Não informado na entrada</h4>
            <div className="grid grid-cols-2 gap-2">
              {itensSemResposta.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded bg-gray-50" />
                  <span>{formatChecklistItemLabel(item.nome)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itensAprovados.length === 0 && itensReprovados.length === 0 && itensSemResposta.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">
              Nenhum teste foi realizado no checklist de entrada.
            </p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 text-sm">Erro ao carregar checklist</p>
      </div>
    );
  }
}
