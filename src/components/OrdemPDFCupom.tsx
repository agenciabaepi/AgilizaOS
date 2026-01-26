'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Formato cupom: 80mm largura (~227pt) x comprimento variável
const CUPOM_WIDTH = 227;
const CUPOM_HEIGHT = 700;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#000',
    width: CUPOM_WIDTH,
    height: CUPOM_HEIGHT,
  },
  center: { textAlign: 'center' },
  bold: { fontWeight: 'bold' },
  line: { borderBottomWidth: 1, borderBottomColor: '#000', marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  block: { marginBottom: 6 },
  mt: { marginTop: 4 },
});

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '---';
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatMoney(val: any) {
  if (val == null) return '---';
  return `R$ ${Number(val).toFixed(2)}`;
}

function stripHTML(html: string | null | undefined): string {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export default function OrdemPDFCupom({ ordem }: { ordem: any }) {
  const totalServico = (ordem.qtd_servico || 1) * (ordem.valor_servico || 0);
  const totalPeca = (ordem.qtd_peca || 1) * (ordem.valor_peca || 0);
  const subtotal = totalServico + totalPeca;
  const total = subtotal - (ordem.desconto || 0);
  const termoResumo = (() => {
    const t = stripHTML(ordem?.termo_garantia?.conteudo) || 'Termo de garantia conforme legislação vigente.';
    return t.length > 100 ? t.slice(0, 100) + '...' : t;
  })();

  return (
    <Document>
      <Page size={[CUPOM_WIDTH, CUPOM_HEIGHT]} style={styles.page}>
        <Text style={[styles.center, styles.bold, { fontSize: 11 }]}>{ordem.empresas?.nome || '---'}</Text>
        <Text style={styles.center}>{ordem.empresas?.telefone || '---'} | {ordem.empresas?.email || '---'}</Text>
        <Text style={styles.center}>{ordem.empresas?.endereco || '---'}</Text>
        <View style={styles.line} />

        <View style={styles.row}>
          <Text style={styles.bold}>OS nº {ordem.numero_os || ordem.id}</Text>
          <Text>Entrada: {formatDate(ordem.created_at)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Prazo: {formatDate(ordem.prazo_entrega)}</Text>
          <Text>Status: {ordem.status || '---'}</Text>
        </View>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block]}>CLIENTE</Text>
        <Text>{ordem.clientes?.nome || '---'}</Text>
        <Text>Tel: {ordem.clientes?.telefone || '---'}</Text>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block]}>EQUIPAMENTO</Text>
        <Text>{ordem.equipamento || '---'} | {ordem.marca || ''} {ordem.modelo || ''}</Text>
        <Text style={styles.block}>Problema: {(ordem.relato || ordem.problema_relatado || '---').toString().slice(0, 120)}{((ordem.relato || ordem.problema_relatado || '').toString().length > 120 ? '...' : '')}</Text>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block]}>SERVIÇOS E PEÇAS</Text>
        {ordem.servico && (
          <View style={styles.row}>
            <Text>{ordem.servico} x{ordem.qtd_servico || 1}</Text>
            <Text>{formatMoney(totalServico)}</Text>
          </View>
        )}
        {ordem.peca && (
          <View style={styles.row}>
            <Text>{ordem.peca} x{ordem.qtd_peca || 1}</Text>
            <Text>{formatMoney(totalPeca)}</Text>
          </View>
        )}
        {(ordem.desconto || 0) > 0 && (
          <View style={styles.row}>
            <Text>Desconto</Text>
            <Text>-{formatMoney(ordem.desconto)}</Text>
          </View>
        )}
        <View style={[styles.row, styles.mt, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 4 }]}>
          <Text style={styles.bold}>TOTAL</Text>
          <Text style={styles.bold}>{formatMoney(total)}</Text>
        </View>
        <View style={styles.line} />

        {(ordem.empresas?.link_publico_ativo ?? true) && (
          <View>
            <Text style={[styles.center, styles.mt]}>Senha para acompanhar: {ordem.senha_acesso || '---'}</Text>
            <Text style={[styles.center, { fontSize: 7, color: '#666', marginTop: 2 }]}>acesse o link enviado ou informe a senha</Text>
          </View>
        )}

        <View style={{ marginTop: 8, padding: 4, backgroundColor: '#f9f9f9' }}>
          <Text style={{ fontSize: 6, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' }}>{ordem.termo_garantia?.nome || 'Termo de Garantia'}</Text>
          <Text style={{ fontSize: 5, lineHeight: 1.2, color: '#333' }}>{termoResumo}</Text>
        </View>

        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 7 }}>_________________________________________</Text>
          <Text style={{ fontSize: 7, marginTop: 2 }}>Assinatura do Cliente</Text>
        </View>
      </Page>
    </Document>
  );
}
