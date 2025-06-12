'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';

export default function ImprimirOrdemServico() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);

  useEffect(() => {
    async function fetchOrdem() {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('*, clientes(*), tecnicos(*), empresas(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar OS:', error);
        return;
      }
      setOrdem(data);
    }

    fetchOrdem();
  }, [id]);

  if (!ordem) return <div>Carregando...</div>;

  return (
    <div style={{ fontFamily: 'Helvetica', fontSize: '12px', padding: '24px', backgroundColor: '#fff', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <img src={ordem.empresas?.logo_url || '/logo.png'} alt="Logo" style={{ height: '64px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{ordem.empresas?.nome}</h1>
            <p style={{ margin: 0, fontSize: '12px' }}><strong>CNPJ:</strong> {ordem.empresas?.cnpj}</p>
            <p style={{ margin: 0, fontSize: '12px' }}>{ordem.empresas?.endereco}</p>
            <p style={{ margin: 0, fontSize: '12px' }}>{ordem.empresas?.telefone} - {ordem.empresas?.email}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ margin: '2px 0' }}><strong>Número da OS:</strong> {ordem.numero_os || ordem.id}</p>
          <p style={{ margin: '2px 0' }}><strong>Data de Entrada:</strong> {ordem.created_at ? new Date(ordem.created_at).toLocaleDateString() : '---'}</p>
          <p style={{ margin: '2px 0' }}><strong>Data de Saída:</strong> {ordem.data_saida ? new Date(ordem.data_saida).toLocaleDateString() : '---'}</p>
          <p style={{ margin: '2px 0' }}><strong>Status:</strong> {ordem.status}</p>
          <p style={{ margin: '2px 0' }}><strong>Garantia:</strong> {ordem.tempo_garantia || '---'}</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Dados do Cliente</h3>
      <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Nome:</strong> {ordem.clientes?.nome}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Telefone:</strong> {ordem.clientes?.telefone}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>CPF:</strong> {ordem.clientes?.cpf}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Endereço:</strong> {ordem.clientes?.endereco}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Aparelho</h3>
      <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Categoria:</strong> {ordem.categoria}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Modelo:</strong> {ordem.modelo}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Marca:</strong> {ordem.marca}</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Cor:</strong> {ordem.cor}</td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }} colSpan={2}><strong>Número de Série:</strong> {ordem.numero_serie}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Serviços</h3>
      <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>Serviço</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qtd</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Valor Unit.</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{ordem.servico}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{ordem.qtd_servico}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>R$ {Number(ordem.valor_servico).toFixed(2)}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>R$ {(ordem.qtd_servico * ordem.valor_servico).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Peças</h3>
      <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9f9f9' }}>
            <th style={{ textAlign: 'left', padding: '8px', border: '1px solid #ddd' }}>Peça</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Qtd</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Valor Unit.</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{ordem.peca}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>{ordem.qtd_peca}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>R$ {Number(ordem.valor_peca).toFixed(2)}</td>
            <td style={{ textAlign: 'center', border: '1px solid #ddd', padding: '8px' }}>R$ {(ordem.qtd_peca * ordem.valor_peca).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Resumo</h3>
      <table style={{ width: '100%', marginBottom: '12px', borderCollapse: 'collapse', border: '1px solid #ccc', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}><strong>Total Faturado:</strong></td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>R$ {Number(ordem.valor_faturado).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginBottom: '6px' }}>Relato do Cliente</h3>
      <p style={{ marginBottom: '12px' }}>{ordem.relato}</p>

      <h3 style={{ marginBottom: '6px' }}>Observações Internas</h3>
      <p style={{ marginBottom: '20px' }}>{ordem.observacao}</p>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ borderTop: '1px solid #000', width: '240px', margin: '0 auto' }}></p>
          <p style={{ marginTop: '4px' }}>Assinatura do Cliente</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ borderTop: '1px solid #000', width: '240px', margin: '0 auto' }}></p>
          <p style={{ marginTop: '4px' }}>Assinatura da Empresa</p>
        </div>
      </div>
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}