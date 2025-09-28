'use client';

import { useState, useEffect } from 'react';
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

interface ChecklistPublicProps {
  checklistData: string | null;
  empresaId?: string;
  equipamentoCategoria?: string; // Nova prop para filtrar por categoria
}

export default function ChecklistPublic({ checklistData, empresaId, equipamentoCategoria }: ChecklistPublicProps) {
  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar itens de checklist da empresa
  useEffect(() => {
    const fetchItens = async () => {
      if (!empresaId) {
        setLoading(false);
        return;
      }

      try {
        // ✅ NOVO: Usar categoria de equipamento se fornecida, caso contrário usar todos
        const url = equipamentoCategoria 
          ? `/api/checklist-itens?empresa_id=${empresaId}&equipamento_categoria=${encodeURIComponent(equipamentoCategoria)}&ativo=true`
          : `/api/checklist-itens?empresa_id=${empresaId}&ativo=true`;
          
        const response = await fetch(url, {
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
  }, [empresaId, equipamentoCategoria]);

  if (!checklistData) return null;

  try {
    const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
    
    // Se o aparelho não liga, mostrar mensagem especial
    if (checklist.aparelhoNaoLiga) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <div>
              <h4 className="text-xs font-medium text-red-800">Aparelho não liga</h4>
              <p className="text-xs text-red-700 mt-1">
                Como o aparelho não liga, não é possível realizar o checklist para verificar quais funcionalidades estão operacionais.
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

    // Separar itens aprovados e reprovados
    const itensAprovados: ChecklistItem[] = [];
    const itensReprovados: ChecklistItem[] = [];

    itens.forEach(item => {
      const isAprovado = checklist[item.id] === true;
      if (isAprovado) {
        itensAprovados.push(item);
      } else {
        itensReprovados.push(item);
      }
    });

    return (
      <div className="space-y-2">
        {itensAprovados.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-green-700 mb-1 text-left">Funcionalidades Operacionais</h4>
            <div className="grid grid-cols-2 gap-1">
              {itensAprovados.map(item => (
                <div key={item.id} className="flex items-center gap-1 text-xs text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itensReprovados.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-red-600 mb-1 text-left">Funcionalidades com Problemas</h4>
            <div className="grid grid-cols-2 gap-1">
              {itensReprovados.map(item => (
                <div key={item.id} className="flex items-center gap-1 text-xs text-gray-700">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {itensAprovados.length === 0 && itensReprovados.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <p className="text-gray-600 text-xs">
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
