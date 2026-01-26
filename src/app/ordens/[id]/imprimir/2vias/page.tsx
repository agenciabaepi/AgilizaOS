'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import OrdemPDF2Vias from '@/components/OrdemPDF2Vias';

export default function Imprimir2ViasPage() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [PDFViewer, setPDFViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function fetchOrdem() {
      if (!id) {
        setError('ID da OS não fornecido');
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabase
          .from('ordens_servico')
          .select(`
            id, numero_os, equipamento, marca, modelo, status, created_at, prazo_entrega, data_entrega, vencimento_garantia,
            servico, observacao, problema_relatado, condicoes_equipamento, cor, numero_serie, acessorios, atendente,
            senha_acesso, senha_aparelho, senha_padrao, qtd_peca, peca, valor_peca, qtd_servico, valor_servico, valor_faturado, desconto,
            empresa_id, termo_garantia_id, clientes(nome, telefone, email, cpf, endereco), tecnico_id,
            empresas(nome, cnpj, endereco, telefone, email, logo_url, link_publico_ativo),
            termo_garantia:termo_garantia_id(id, nome, conteudo)
          `)
          .eq('id', id)
          .single();

        if (err) {
          setError(`Erro ao buscar OS: ${err.message}`);
          setLoading(false);
          return;
        }

        if (data) {
          let tecnicoNome = 'Sem técnico';
          if (data.tecnico_id) {
            const { data: t } = await supabase.from('usuarios').select('nome').eq('id', data.tecnico_id).single();
            if (t?.nome) tecnicoNome = t.nome;
          }
          setOrdem({
            ...data,
            relato: data.problema_relatado,
            tecnico: { nome: tecnicoNome },
          });
        } else {
          setError('OS não encontrada');
        }
      } catch (e: any) {
        setError(e?.message || 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    }
    fetchOrdem();
  }, [id]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    import('@react-pdf/renderer').then((mod) => setPDFViewer(() => mod.PDFViewer));
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-gray-600">Carregando 2 vias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Erro ao carregar</h2>
          <p className="mb-4 text-gray-600">{error}</p>
          <button onClick={() => window.history.back()} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (!PDFViewer || !ordem) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Preparando impressão...</p>
      </div>
    );
  }

  return (
    <PDFViewer style={{ width: '100vw', height: '100vh' }}>
      <OrdemPDF2Vias ordem={ordem} />
    </PDFViewer>
  );
}
