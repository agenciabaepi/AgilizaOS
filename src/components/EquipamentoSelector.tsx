'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiPlus, FiX, FiPackage } from 'react-icons/fi';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/context/AuthContext';
import { bearerAuthHeaders } from '@/lib/api/clientAuthHeaders';
import type { TipoEquipamento, TipoEquipamentoSelecionado } from '@/types/equipamentos';
import { tipoEquipamentoLabel } from '@/types/equipamentos';
import { toTipoEquipamentoSelecionado } from '@/lib/equipamentos-tipos-merge';

interface EquipamentoSelectorProps {
  empresaId: string;
  value?: TipoEquipamentoSelecionado | null;
  /** Compat: código do tipo (ex. CELULAR) */
  valueCodigo?: string;
  onChange: (tipo: TipoEquipamentoSelecionado | null) => void;
  placeholder?: string;
  className?: string;
}

export default function EquipamentoSelector({
  empresaId,
  value = null,
  valueCodigo,
  onChange,
  placeholder = 'Selecione o tipo de equipamento',
  className = '',
}: EquipamentoSelectorProps) {
  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selected, setSelected] = useState<TipoEquipamentoSelecionado | null>(value);
  const isUserSearchingRef = useRef(false);

  const [newTipo, setNewTipo] = useState({ nome: '', descricao: '' });

  const { addToast } = useToast();
  const { session } = useAuth();

  const fetchTipos = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/equipamentos-tipos?empresa_id=${empresaId}&ativo=true&unificado=true`,
        { headers: bearerAuthHeaders(session), credentials: 'include' }
      );
      const data = await res.json();
      if (res.ok) {
        setTipos(data.tipos || []);
      } else {
        addToast('Erro ao carregar tipos de equipamento', 'error');
      }
    } catch {
      addToast('Erro ao carregar tipos de equipamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipos();
  }, [empresaId, session?.access_token]);

  useEffect(() => {
    if (isUserSearchingRef.current) return;
    if (value) {
      setSelected(value);
      setSearchTerm(tipoEquipamentoLabel(value));
      return;
    }
    if (valueCodigo && tipos.length > 0) {
      const codigoNorm = valueCodigo.toUpperCase();
      const found = tipos.find(
        (t) => t.codigo === codigoNorm || t.nome.toUpperCase() === codigoNorm
      );
      if (found) {
        const sel = toTipoEquipamentoSelecionado(found);
        setSelected(sel);
        setSearchTerm(tipoEquipamentoLabel(sel));
        if (!value) {
          onChange({ ...sel });
        }
        return;
      }
      setSearchTerm(valueCodigo);
      setSelected(null);
    } else if (!valueCodigo) {
      setSearchTerm('');
      setSelected(null);
    }
  }, [value, valueCodigo, tipos]);

  const filtered = tipos.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.nome.toLowerCase().includes(q) ||
      t.codigo.toLowerCase().includes(q)
    );
  });

  const handleSelect = (tipo: TipoEquipamento) => {
    isUserSearchingRef.current = false;
    const sel = toTipoEquipamentoSelecionado(tipo);
    setSelected(sel);
    setSearchTerm(tipoEquipamentoLabel(sel));
    setShowDropdown(false);
    setShowAddForm(false);
    onChange({ ...sel });
  };

  const handleAddTipo = async () => {
    if (!newTipo.nome.trim()) {
      addToast('Nome é obrigatório', 'error');
      return;
    }
    try {
      const nome = newTipo.nome.trim().toUpperCase();
      const res = await fetch('/api/equipamentos-tipos', {
        method: 'POST',
        headers: bearerAuthHeaders(session, { 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          nome,
          categoria: nome,
          descricao: newTipo.descricao,
          empresa_id: empresaId,
          ativo: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.equipamento) {
        addToast('Tipo cadastrado!', 'success');
        await fetchTipos();
        const custom: TipoEquipamento = {
          id: data.equipamento.id,
          codigo: nome,
          nome,
          descricao: newTipo.descricao,
          origem: 'empresa',
          catalogoId: null,
          empresaTipoId: data.equipamento.id,
        };
        handleSelect(custom);
        setNewTipo({ nome: '', descricao: '' });
        setShowAddForm(false);
      } else {
        addToast(data.error || 'Erro ao cadastrar tipo', 'error');
      }
    } catch {
      addToast('Erro ao cadastrar tipo', 'error');
    }
  };

  const handleClear = () => {
    isUserSearchingRef.current = false;
    setSelected(null);
    setSearchTerm('');
    onChange(null);
  };

  return (
    <div className={`${className} ${showDropdown ? 'relative z-50' : 'relative'}`}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            isUserSearchingRef.current = true;
            setSearchTerm(e.target.value);
            setSelected(null);
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {(selected || value) && (
            <button type="button" onClick={handleClear} className="p-1 text-gray-400 hover:text-gray-600">
              <FiX size={16} />
            </button>
          )}
          <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="p-1 text-gray-400 hover:text-gray-600">
            <FiSearch size={16} />
          </button>
        </div>

        {showDropdown && (
          <>
            <div className="absolute left-0 right-0 top-full z-[60] mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-3 text-center text-gray-500 text-sm">Carregando...</div>
              ) : filtered.length > 0 ? (
                filtered.map((tipo) => (
                  <button
                    key={`${tipo.origem}-${tipo.id}`}
                    type="button"
                    onClick={() => handleSelect(tipo)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                  >
                    <FiPackage className="text-amber-600 flex-shrink-0" size={16} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-sm">{tipo.nome}</div>
                      <div className="text-xs text-gray-400">{tipo.codigo}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${tipo.origem === 'catalogo_global' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                      {tipo.origem === 'catalogo_global' ? 'Consert' : 'Meu'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500 text-sm">Nenhum tipo encontrado</div>
              )}

              <div className="border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="w-full px-3 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 text-sm"
                >
                  <FiPlus size={16} />
                  Cadastrar meu tipo de equipamento
                </button>
              </div>

              {showAddForm && (
                <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                  <input
                    type="text"
                    placeholder="Ex: DRONE, IMPRESSORA 3D"
                    value={newTipo.nome}
                    onChange={(e) => setNewTipo((p) => ({ ...p, nome: e.target.value.toUpperCase() }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Descrição (opcional)"
                    value={newTipo.descricao}
                    onChange={(e) => setNewTipo((p) => ({ ...p, descricao: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddTipo} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div
              className="fixed inset-0 z-[55]"
              onClick={() => {
                setShowDropdown(false);
                setShowAddForm(false);
              }}
              aria-hidden
            />
          </>
        )}
      </div>
      {/* Reserva espaço no fluxo para o dropdown não cobrir o seletor de aparelhos */}
      {showDropdown && <div className="h-64 shrink-0" aria-hidden />}
    </div>
  );
}
