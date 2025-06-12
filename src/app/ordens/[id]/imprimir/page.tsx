'use client';

import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 11, fontFamily: 'Helvetica' },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, marginBottom: 4, fontWeight: 'bold' },
  text: { marginBottom: 2 },
  bold: { fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  signatureRow: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
});

function OrdemPDF({ ordem }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.heading}>ConsertOS - Assistência Técnica</Text>
          <Text>Av. Exemplo, 1234 - Ilhabela - SP</Text>
          <Text>Telefone: (12) 99999-9999</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Ordem de Serviço #{ordem.numero_os}</Text>
          <Text>Data: {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Cliente</Text>
          <Text>Nome: {ordem.clientes?.nome}</Text>
          <Text>Telefone: {ordem.clientes?.telefone}</Text>
          <Text>CPF: {ordem.clientes?.cpf}</Text>
          <Text>Endereço: {ordem.clientes?.endereco}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Aparelho</Text>
          <Text>Categoria: {ordem.categoria}</Text>
          <Text>Modelo: {ordem.modelo}</Text>
          <Text>Cor: {ordem.cor}</Text>
          <Text>Marca: {ordem.marca}</Text>
          <Text>Número de Série: {ordem.numero_serie}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Serviços e Peças</Text>
          <Text>Serviço: {ordem.servico} (x{ordem.qtd_servico}) - R$ {Number(ordem.valor_servico).toFixed(2)}</Text>
          <Text>Peça: {ordem.peca} (x{ordem.qtd_peca}) - R$ {Number(ordem.valor_peca).toFixed(2)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Valores</Text>
          <Text>Total Faturado: R$ {Number(ordem.valor_faturado).toFixed(2)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Relato do Cliente</Text>
          <Text>{ordem.relato}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Observações Internas</Text>
          <Text>{ordem.observacao}</Text>
        </View>

        <View style={styles.signatureRow}>
          <View>
            <Text>________________________</Text>
            <Text>Assinatura do Cliente</Text>
          </View>
          <View>
            <Text>Data: {new Date().toLocaleDateString()}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

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
    <PDFViewer style={{ width: '100%', height: '100vh' }}>
      <OrdemPDF ordem={ordem} />
    </PDFViewer>
  );
}