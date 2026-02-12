'use client';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    color: '#000',
  },
  via: {
    height: 395,
    marginBottom: 0,
  },
  viaTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logo: { width: 56, height: 56, objectFit: 'contain', marginRight: 10 },
  company: { flex: 1 },
  osBlock: { alignItems: 'flex-end' },
  companyName: { fontWeight: 'bold', fontSize: 12, marginBottom: 1 },
  companyText: { fontSize: 8, marginBottom: 0 },
  osText: { fontSize: 7, marginBottom: 1 },
  line: { borderBottomWidth: 1, borderBottomColor: '#ccc', marginVertical: 4 },
  section: { marginBottom: 3 },
  sectionTitle: { fontWeight: 'bold', fontSize: 8, marginBottom: 1 },
  row: { flexDirection: 'row', marginBottom: 1, fontSize: 7 },
  cell: { flex: 1 },
  table: { marginTop: 2 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingVertical: 2 },
  tableHdr: { flex: 3, fontWeight: 'bold', fontSize: 7 },
  tableHdrR: { flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: 7 },
  tableCell: { flex: 3, fontSize: 7 },
  tableCellR: { flex: 1, textAlign: 'right', fontSize: 7 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2, paddingTop: 2, borderTopWidth: 1, borderTopColor: '#000', fontWeight: 'bold', fontSize: 8 },
  termoBlock: { marginTop: 4, padding: 6, backgroundColor: '#f9f9f9' },
  termoTitulo: { fontSize: 8, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' },
  termoTexto: { fontSize: 6, lineHeight: 1.25, color: '#333' },
  assinatura: { marginTop: 8, paddingTop: 4, textAlign: 'center' },
  assinaturaLine: { fontSize: 7, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#999', marginVertical: 4 },
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

/** Converte HTML em texto preservando quebras (p, br, li) e itens numerados. Termo exibido inteiro (sem corte). */
function termoHTMLToReadable(html: string | null | undefined): string {
  if (!html) return '';
  let s = String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*p\s*>/gi, '\n')
    .replace(/<\s*\/\s*li\s*>/gi, '\n')
    .replace(/<\s*\/\s*div\s*>/gi, '\n');
  s = s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  s = s.replace(/\s+(\d+)\.\s+([A-ZÇÃÕÂÊÎÔÛÁÉÍÓÚ][A-Za-zÇãõâêîôûáéíóúÀ-ÿ\-]*:?)/g, '\n\n$1. $2');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function ViaBlock({ ordem, viaLabel }: { ordem: any; viaLabel: string }) {
  const totalServico = (ordem.qtd_servico || 1) * (ordem.valor_servico || 0);
  const totalPeca = (ordem.qtd_peca || 1) * (ordem.valor_peca || 0);
  const subtotal = totalServico + totalPeca;
  const total = subtotal - (ordem.desconto || 0);

  return (
    <View style={styles.via}>
      <Text style={styles.viaTitle}>{viaLabel}</Text>
      <View style={styles.header}>
        <Image src={ordem.empresas?.logo_url || '/logo.png'} style={styles.logo} />
        <View style={styles.company}>
          <Text style={styles.companyName}>{ordem.empresas?.nome || '---'}</Text>
          <Text style={styles.companyText}>{ordem.empresas?.telefone || '---'} | {ordem.empresas?.endereco || '---'}</Text>
        </View>
        <View style={styles.osBlock}>
          <Text style={styles.osText}>OS: {String(ordem.numero_os || ordem.id)}</Text>
          <Text style={styles.osText}>Entrada: {formatDate(ordem.created_at)}</Text>
          <Text style={styles.osText}>Prazo: {formatDate(ordem.prazo_entrega)}</Text>
          <Text style={styles.osText}>Entrega: {formatDate(ordem.data_entrega)}</Text>
          <Text style={styles.osText}>Garantia: {formatDate(ordem.vencimento_garantia)}</Text>
          <Text style={styles.osText}>Status: {ordem.status || '---'}</Text>
        </View>
      </View>
      <View style={styles.line} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cliente</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Nome:</Text> {ordem.clientes?.nome || '---'}</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Tel:</Text> {ordem.clientes?.telefone || '---'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aparelho</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Equip.:</Text> {ordem.equipamento || '---'} | {ordem.marca || ''} {ordem.modelo || ''}</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Cor:</Text> {ordem.cor || '---'}  <Text style={{ fontWeight: 'bold' }}>Nº Série:</Text> {ordem.numero_serie || '---'}</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Acess.:</Text> {ordem.acessorios || '---'}</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Cond.:</Text> {(ordem.condicoes_equipamento || '---').toString().slice(0, 60)}{((ordem.condicoes_equipamento || '').toString().length > 60 ? '...' : '')}</Text>
        <Text style={styles.row}><Text style={{ fontWeight: 'bold' }}>Problema:</Text> {(ordem.relato || ordem.problema_relatado || '---').toString().slice(0, 85)}{((ordem.relato || ordem.problema_relatado || '').toString().length > 85 ? '...' : '')}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serviços e peças</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableHdr}>Item</Text>
            <Text style={styles.tableHdrR}>Subtotal</Text>
          </View>
          {ordem.servico && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{ordem.servico} x{String(ordem.qtd_servico ?? 1)}</Text>
              <Text style={styles.tableCellR}>{formatMoney(totalServico)}</Text>
            </View>
          )}
          {ordem.peca && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>{ordem.peca} x{String(ordem.qtd_peca ?? 1)}</Text>
              <Text style={styles.tableCellR}>{formatMoney(totalPeca)}</Text>
            </View>
          )}
          {(ordem.desconto || 0) > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Desconto</Text>
              <Text style={styles.tableCellR}>-{formatMoney(ordem.desconto)}</Text>
            </View>
          )}
        </View>
        <View style={styles.totalRow}>
          <Text>TOTAL: {formatMoney(total)}</Text>
        </View>
      </View>
      {(ordem.empresas?.link_publico_ativo ?? true) && (
        <Text style={{ fontSize: 7, marginTop: 2 }}>Senha: {ordem.senha_acesso || '---'}</Text>
      )}

      <View style={styles.termoBlock}>
        <Text style={styles.termoTitulo}>{ordem.termo_garantia?.nome || 'Termo de Garantia'}</Text>
        <Text style={styles.termoTexto}>
          {termoHTMLToReadable(ordem.termo_garantia?.conteudo) || 'Termo de garantia conforme legislação vigente.'}
        </Text>
      </View>

      <View style={styles.assinatura}>
        <Text style={styles.assinaturaLine}>_____________________________________</Text>
        <Text style={styles.assinaturaLine}>Assinatura do Cliente</Text>
      </View>
    </View>
  );
}

export default function OrdemPDF2Vias({ ordem }: { ordem: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ViaBlock ordem={ordem} viaLabel="VIA 1 - CLIENTE" />
        <View style={styles.divider} />
        <ViaBlock ordem={ordem} viaLabel="VIA 2 - LOJA" />
      </Page>
    </Document>
  );
}
