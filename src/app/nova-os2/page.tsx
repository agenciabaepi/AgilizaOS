"use client";

import MenuLayout from "@/components/MenuLayout";
import ProtectedArea from '@/components/ProtectedArea';
import { Button } from '@/components/Button';
import { Select } from '@/components/Select';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const etapas = ["Cliente", "Aparelho", "Responsáveis", "Status", "Obs.", "Imagens"];

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
}

export default function NovaOSModernPage() {
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string | null>(null);
  const [loadingClientes, setLoadingClientes] = useState(false);

  useEffect(() => {
    async function fetchClientes() {
      setLoadingClientes(true);
      const { data, error } = await supabase.from('clientes').select('id, nome, telefone, email');
      if (!error && data) setClientes(data);
      setLoadingClientes(false);
    }
    fetchClientes();
  }, []);

  return (
    <MenuLayout>
      <ProtectedArea area="ordens">
        <div className="max-w-4xl mx-auto py-10">
          {/* Cabeçalho */}
          <div className="w-full text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Nova Ordem de Serviço</h1>
            <div className="text-gray-500 text-base font-medium">
              Etapa {etapaAtual} de {etapas.length} — <span className="font-semibold">{etapas[etapaAtual-1]}</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
            <div className="bg-black h-2 rounded-full transition-all duration-300" style={{ width: `${(etapaAtual/etapas.length)*100}%` }} />
          </div>

          {/* Etapas */}
          <div className="flex items-center justify-between w-full mb-8 gap-4">
            {etapas.map((label, idx) => (
              <div key={label} className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 ${
                  etapaAtual === idx+1 ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                } font-bold`}>
                  {idx + 1}
                </div>
                <span className="text-xs mt-2 text-center font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          {/* Card/Container da etapa */}
          <div className="bg-white rounded-xl border border-gray-200 shadow p-8 mb-8 min-h-[200px] flex flex-col items-center justify-center">
            {etapaAtual === 1 && (
              <div className="w-full max-w-md mx-auto flex flex-col gap-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o cliente</label>
                <Select
                  options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                  value={
                    clienteSelecionado
                      ? { value: clienteSelecionado, label: clientes.find(c => c.id === clienteSelecionado)?.nome || "" }
                      : undefined
                  }
                  onChange={opt => setClienteSelecionado(opt?.value || null)}
                  isLoading={loadingClientes}
                  placeholder="Buscar cliente..."
                  className="mb-4"
                />
                <Button variant="secondary" className="w-full" onClick={() => alert('Cadastro rápido de cliente (em breve)')}>Cadastrar novo cliente</Button>
              </div>
            )}
            {etapaAtual !== 1 && (
              <span className="text-lg text-gray-700">Conteúdo da etapa <b>{etapas[etapaAtual-1]}</b> aqui...</span>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-4 justify-end">
            <Button variant="secondary" onClick={() => setEtapaAtual((e) => Math.max(1, e-1))} disabled={etapaAtual === 1}>Voltar</Button>
            <Button variant="default" onClick={() => setEtapaAtual((e) => Math.min(etapas.length, e+1))} disabled={etapaAtual === etapas.length || (etapaAtual === 1 && !clienteSelecionado)}>Próximo</Button>
          </div>
        </div>
      </ProtectedArea>
    </MenuLayout>
  );
} 