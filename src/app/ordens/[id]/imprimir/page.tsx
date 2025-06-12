'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  loadingText: {
    fontFamily: 'Helvetica',
    fontSize: 12,
    padding: 24,
  },
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 12,
    paddingHorizontal: 40,
    paddingBottom: 36,
    backgroundColor: '#fff',
    color: '#000',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    marginTop: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  logo: {
    height: 90,
    width: 110,
    objectFit: 'contain',
    marginTop: -30,
  },
  container: {
    maxWidth: 500,
    margin: '0 auto',
  },
  companyInfo: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  companyName: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
  },
  companyText: {
    margin: 0,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 8,
    lineHeight: 1.1,
    letterSpacing: -0.4,
  },
  headerRightGroup: {
    fontSize: 10,
    lineHeight: 1.2,
    letterSpacing: -0.25,
  },
  headerRightText: {
    marginVertical: 1,
    textAlign: 'left',
  },
  headerRightTextStrong: {
    fontSize: 10,
    lineHeight: 1.2,
    letterSpacing: -0.3,
    fontWeight: 'bold',
  },
  sectionTitle: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  table: {
    width: '100%',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowHeader: {
    backgroundColor: '#eee',
  },
  tableCell: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'solid',
    padding: 2,
    width: '25%',
  },
  tableCellLeftAlign: {
    textAlign: 'left',
  },
  tableCellCenterAlign: {
    textAlign: 'center',
  },
  tableCellColSpan2: {
    flexGrow: 2,
  },
  signatureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  signatureBox: {
    textAlign: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    width: 240,
    marginHorizontal: 'auto',
  },
  signatureText: {
    marginTop: 4,
  },
  paragraph: {
    marginBottom: 12,
  },
  paragraphLast: {
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
});

function OrdemPDF({ ordem }: { ordem: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {ordem.empresas?.logo_url ? (
                <Image src={ordem.empresas.logo_url} style={styles.logo} />
              ) : (
                <Image src="/logo.png" style={styles.logo} />
              )}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{ordem.empresas?.nome}</Text>
                <Text style={styles.companyText}><Text style={styles.bold}>CNPJ:</Text> {ordem.empresas?.cnpj}</Text>
                <Text style={styles.companyText}>{ordem.empresas?.endereco}</Text>
                <Text style={styles.companyText}>{ordem.empresas?.telefone} - {ordem.empresas?.email}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.headerRightGroup}>
                <Text style={styles.headerRightTextStrong}>Número da OS: {ordem.numero_os || ordem.id}</Text>
                <Text style={styles.headerRightTextStrong}>Data de Entrada: {ordem.created_at ? new Date(ordem.created_at).toLocaleDateString() : '---'}</Text>
                <Text style={styles.headerRightTextStrong}>Data de Saída: {ordem.data_saida ? new Date(ordem.data_saida).toLocaleDateString() : '---'}</Text>
                <Text style={styles.headerRightTextStrong}>Status: {ordem.status}</Text>
                <Text style={styles.headerRightTextStrong}>Garantia: {ordem.tempo_garantia || '---'}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Dados do Cliente</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>Nome:</Text> {ordem.clientes?.nome}</Text>
              <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>Telefone:</Text> {ordem.clientes?.telefone}</Text>
              <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>CPF:</Text> {ordem.clientes?.cpf}</Text>
              <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>Endereço:</Text> {ordem.clientes?.endereco}</Text>
            </View>
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://exemplo.com/ordem/${ordem.id}`}
              style={{ width: 80, height: 80, marginLeft: 24 }}
            />
          </View>

          <Text style={styles.sectionTitle}>Aparelho</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>Equipamento</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>Cor</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>Marca</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>Modelo</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>{ordem.categoria}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>{ordem.cor}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>{ordem.marca}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { width: '25%' }]}>{ordem.modelo}</Text>
            </View>
         
          </View>

          <Text style={styles.sectionTitle}>Serviços e Peças</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={[styles.tableCell, styles.tableCellLeftAlign]}>Item</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>Qtd</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>Valor Unit.</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>Subtotal</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLeftAlign]}>{ordem.servico}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>{ordem.qtd_servico}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>R$ {Number(ordem.valor_servico).toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>R$ {(ordem.qtd_servico * ordem.valor_servico).toFixed(2)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLeftAlign]}>{ordem.peca}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>{ordem.qtd_peca}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>R$ {Number(ordem.valor_peca).toFixed(2)}</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}>R$ {(ordem.qtd_peca * ordem.valor_peca).toFixed(2)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellLeftAlign]}></Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign]}></Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, styles.bold]}>Total</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign,  styles.bold]}>
                R$ {(ordem.qtd_servico * ordem.valor_servico + ordem.qtd_peca * ordem.valor_peca).toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Relato do Cliente</Text>
          <Text style={styles.paragraph}>{ordem.relato}</Text>

          <Text style={styles.sectionTitle}>Observações Internas</Text>
          <Text style={styles.paragraphLast}>{ordem.observacao}</Text>

          <View style={styles.signatureContainer}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}></View>
              <Text style={styles.signatureText}>Assinatura do Cliente</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine}></View>
              <Text style={styles.signatureText}>Assinatura da Empresa</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function ImprimirOrdemServico() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [PDFViewer, setPDFViewer] = useState<any>(null);

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

  useEffect(() => {
    import('@react-pdf/renderer').then((mod) => {
      setPDFViewer(() => mod.PDFViewer);
    });
  }, []);

  if (!PDFViewer || !ordem) {
    return (
      <div className="loadingText">
        Carregando...
      </div>
    );
  }

  return (
    <PDFViewer style={{ width: '100vw', height: '100vh' }}>
      <OrdemPDF ordem={ordem} />
    </PDFViewer>
  );
}