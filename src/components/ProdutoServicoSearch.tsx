'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiSearch, FiX } from 'react-icons/fi';

interface ProdutoServico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  tipo: 'produto' | 'servico';
  codigo?: string;
}

interface ProdutoServicoSearchProps {
  onSelect: (item: ProdutoServico) => void;
  placeholder?: string;
  tipo?: 'produto' | 'servico' | 'todos';
  empresaId?: string;
}

export default function ProdutoServicoSearch({ 
  onSelect, 
  placeholder = "Buscar produtos ou serviços...",
  tipo = 'todos',
  empresaId 
}: ProdutoServicoSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ProdutoServico[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProdutos = async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      
      try {
        let query = supabase
          .from('produtos_servicos')
          .select('id, nome, descricao, preco, tipo, codigo')
          .ilike('nome', `%${searchTerm}%`)
          .eq('ativo', true)
          .limit(10);

        if (tipo !== 'todos') {
          query = query.eq('tipo', tipo);
        }

        if (empresaId) {
          query = query.eq('empresa_id', empresaId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao buscar produtos:', error);
          setResults([]);
        } else {
          setResults(data || []);
          setIsOpen(data && data.length > 0);
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProdutos, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, tipo, empresaId]);

  const handleSelect = (item: ProdutoServico) => {
    onSelect(item);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'produto' ? 'Produto' : 'Serviço';
  };

  const getTipoColor = (tipo: string) => {
    return tipo === 'produto' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-green-100 text-green-800';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full border border-gray-300 px-4 py-3 pl-10 pr-10 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Buscando...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Nenhum resultado encontrado</p>
            </div>
          ) : (
            <div className="py-1">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.nome}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTipoColor(item.tipo)}`}>
                          {getTipoLabel(item.tipo)}
                        </span>
                      </div>
                      {item.descricao && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{item.descricao}</p>
                      )}
                      {item.codigo && (
                        <p className="text-xs text-gray-400 mt-1">Código: {item.codigo}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">{formatPrice(item.preco)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 