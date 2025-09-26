'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiX } from 'react-icons/fi';
import { useToast } from '@/hooks/useToast';

interface EquipamentoTipo {
  id: string;
  nome: string;
  categoria: string;
  descricao?: string;
  ativo: boolean;
  quantidade_cadastrada: number;
}

interface EquipamentoSelectorProps {
  empresaId: string;
  value?: string;
  onChange: (equipamento: EquipamentoTipo | null) => void;
  placeholder?: string;
  className?: string;
}

export default function EquipamentoSelector({
  empresaId,
  value,
  onChange,
  placeholder = "Selecione um equipamento",
  className = ""
}: EquipamentoSelectorProps) {
  const [equipamentos, setEquipamentos] = useState<EquipamentoTipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<EquipamentoTipo | null>(null);
  
  // Form para adicionar novo equipamento
  const [newEquipamento, setNewEquipamento] = useState({
    nome: '',
    descricao: ''
  });

  const { addToast } = useToast();

  // Buscar equipamentos
  const fetchEquipamentos = async () => {
    if (!empresaId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/equipamentos-tipos?empresa_id=${empresaId}&ativo=true`);
      const data = await response.json();
      
      if (response.ok) {
        setEquipamentos(data.equipamentos || []);
      } else {
        addToast('Erro ao carregar equipamentos', 'error');
      }
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
      addToast('Erro ao carregar equipamentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipamentos();
  }, [empresaId]);

  // 🔍 DEBUG: Processar valor inicial quando fornecido
  useEffect(() => {
    if (value && equipamentos.length > 0) {
      console.log('🔍 DEBUG EquipamentoSelector - Processando valor inicial:', value);
      const equipamentoEncontrado = equipamentos.find(eq => eq.nome === value);
      if (equipamentoEncontrado) {
        console.log('✅ Equipamento encontrado:', equipamentoEncontrado);
        setSelectedEquipamento(equipamentoEncontrado);
        setSearchTerm(equipamentoEncontrado.nome);
      } else {
        console.log('⚠️ Equipamento não encontrado na lista:', value);
        // Se não encontrar na lista, usar o valor como texto livre
        setSearchTerm(value);
        setSelectedEquipamento(null);
      }
    } else if (value && equipamentos.length === 0) {
      // Se há valor mas equipamentos ainda não carregaram, usar como texto livre
      console.log('🔍 Valor fornecido mas equipamentos ainda não carregaram:', value);
      setSearchTerm(value);
      setSelectedEquipamento(null);
    } else if (!value) {
      // Se não há valor, limpar tudo
      setSearchTerm('');
      setSelectedEquipamento(null);
    }
  }, [value, equipamentos]);

  // Filtrar equipamentos baseado na busca
  const filteredEquipamentos = equipamentos.filter(equipamento =>
    equipamento.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipamento.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selecionar equipamento
  const handleSelectEquipamento = (equipamento: EquipamentoTipo) => {
    setSelectedEquipamento(equipamento);
    onChange(equipamento);
    setShowDropdown(false);
    setSearchTerm(equipamento.nome); // Mostrar o nome do equipamento selecionado
  };

  // Adicionar novo equipamento
  const handleAddEquipamento = async () => {
    if (!newEquipamento.nome) {
      addToast('Nome é obrigatório', 'error');
      return;
    }

    try {
      const response = await fetch('/api/equipamentos-tipos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: newEquipamento.nome,
          categoria: newEquipamento.nome, // Usar nome como categoria
          descricao: newEquipamento.descricao,
          empresa_id: empresaId,
          ativo: true
        }),
      });

      const data = await response.json();

      if (response.ok) {
        addToast('Equipamento adicionado com sucesso!', 'success');
        setEquipamentos(prev => [...prev, data.equipamento]);
        handleSelectEquipamento(data.equipamento);
        setNewEquipamento({ nome: '', descricao: '' });
        setShowAddForm(false);
      } else {
        addToast(data.error || 'Erro ao adicionar equipamento', 'error');
      }
    } catch (error) {
      console.error('Erro ao adicionar equipamento:', error);
      addToast('Erro ao adicionar equipamento', 'error');
    }
  };

  // Limpar seleção
  const handleClear = () => {
    setSelectedEquipamento(null);
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input principal */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedEquipamento(null); // Limpar seleção quando usuário digita
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
        />
        
        {/* Botões de ação */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {selectedEquipamento && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <FiX size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <FiSearch size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {/* Lista de equipamentos */}
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              Carregando equipamentos...
            </div>
          ) : filteredEquipamentos.length > 0 ? (
            filteredEquipamentos.map((equipamento) => (
              <button
                key={equipamento.id}
                type="button"
                onClick={() => handleSelectEquipamento(equipamento)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{equipamento.nome}</div>
                {equipamento.descricao && (
                  <div className="text-xs text-gray-400 mt-1">{equipamento.descricao}</div>
                )}
              </button>
            ))
          ) : (
            <div className="p-3 text-center text-gray-500">
              Nenhum equipamento encontrado
            </div>
          )}

          {/* Botão para adicionar novo */}
          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2"
            >
              <FiPlus size={16} />
              Adicionar novo equipamento
            </button>
          </div>

          {/* Form para adicionar novo equipamento */}
          {showAddForm && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Ex: CELULAR, NOTEBOOK, IMPRESSORA"
                  value={newEquipamento.nome}
                  onChange={(e) => setNewEquipamento(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={newEquipamento.descricao}
                  onChange={(e) => setNewEquipamento(prev => ({ ...prev, descricao: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddEquipamento}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
