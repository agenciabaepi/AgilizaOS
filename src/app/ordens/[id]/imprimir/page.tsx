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
        .select('*, clientes(*), tecnicos(*)')
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
    <div style={{ fontFamily: 'Helvetica', fontSize: '12px', padding: '40px', backgroundColor: '#fff', color: '#000' }}>
      <div style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <img src="/logo.png" alt="Logo" style={{ height: '40px', marginBottom: '10px' }} />
          <p><strong>ConsertOS - Assistência Técnica</strong></p>
          <p>Av. Exemplo, 1234 - Ilhabela - SP</p>
          <p>Telefone: (12) 99999-9999</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>Ordem de Serviço Nº {ordem.numero_os}</strong></p>
          <p>Data: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Dados do Cliente</h3>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td><strong>Nome:</strong> {ordem.clientes?.nome}</td>
            <td><strong>Telefone:</strong> {ordem.clientes?.telefone}</td>
          </tr>
          <tr>
            <td><strong>CPF:</strong> {ordem.clientes?.cpf}</td>
            <td><strong>Endereço:</strong> {ordem.clientes?.endereco}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Aparelho</h3>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td><strong>Categoria:</strong> {ordem.categoria}</td>
            <td><strong>Modelo:</strong> {ordem.modelo}</td>
          </tr>
          <tr>
            <td><strong>Marca:</strong> {ordem.marca}</td>
            <td><strong>Cor:</strong> {ordem.cor}</td>
          </tr>
          <tr>
            <td><strong>Número de Série:</strong> {ordem.numero_serie}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Serviços</h3>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ textAlign: 'left', padding: '6px' }}>Serviço</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px' }}>{ordem.servico}</td>
            <td style={{ textAlign: 'center' }}>{ordem.qtd_servico}</td>
            <td style={{ textAlign: 'center' }}>R$ {Number(ordem.valor_servico).toFixed(2)}</td>
            <td style={{ textAlign: 'center' }}>R$ {(ordem.qtd_servico * ordem.valor_servico).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Peças</h3>
      <table style={{ width: '100%', marginBottom: '20px', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4' }}>
            <th style={{ textAlign: 'left', padding: '6px' }}>Peça</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px' }}>{ordem.peca}</td>
            <td style={{ textAlign: 'center' }}>{ordem.qtd_peca}</td>
            <td style={{ textAlign: 'center' }}>R$ {Number(ordem.valor_peca).toFixed(2)}</td>
            <td style={{ textAlign: 'center' }}>R$ {(ordem.qtd_peca * ordem.valor_peca).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ borderBottom: '1px solid #000', paddingBottom: '4px' }}>Resumo</h3>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td><strong>Total Faturado:</strong></td>
            <td>R$ {Number(ordem.valor_faturado).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ marginBottom: '6px' }}>Relato do Cliente</h3>
      <p style={{ marginBottom: '20px' }}>{ordem.relato}</p>

      <h3 style={{ marginBottom: '6px' }}>Observações Internas</h3>
      <p style={{ marginBottom: '40px' }}>{ordem.observacao}</p>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <p style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto' }}></p>
        <p style={{ marginTop: '4px' }}>Assinatura do Cliente</p>
      </div>
    </div>
  );
}