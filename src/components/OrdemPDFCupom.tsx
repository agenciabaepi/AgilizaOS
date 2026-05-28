'use client';

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { getStatusTecnicoLabel } from '@/utils/statusLabels';

// 80 mm ≈ 227 pt; altura A4 para permitir fluxo com wrap (várias “folhas” no PDF)
const CUPOM_WIDTH = 227;
const PAGE_HEIGHT = 842;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  center: { textAlign: 'center' },
  bold: { fontWeight: 'bold' },
  label: { fontWeight: 'bold', color: '#000' },
  line: { borderBottomWidth: 1.5, borderBottomColor: '#000', marginVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    width: '100%',
  },
  valueDescWrap: {
    flex: 1,
    paddingRight: 8,
    maxWidth: CUPOM_WIDTH - 78,
  },
  valueDesc: { fontWeight: 'bold', fontSize: 10 },
  valueAmount: {
    fontWeight: 'bold',
    fontSize: 10,
    width: 58,
    textAlign: 'right',
    flexShrink: 0,
  },
  valueTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1.5,
    borderTopColor: '#000',
    width: '100%',
  },
  valueTotalAmount: {
    fontWeight: 'bold',
    fontSize: 12,
    width: 58,
    textAlign: 'right',
    flexShrink: 0,
  },
  block: { marginBottom: 7 },
  mt: { marginTop: 5 },
  secondary: { fontSize: 9, color: '#000' },
  termoTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, textAlign: 'center', color: '#000' },
  termoSectionTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 3, color: '#000' },
  termoLine: { fontSize: 10, lineHeight: 1.5, color: '#000', marginBottom: 3 },
  logoWrap: { alignItems: 'center', marginBottom: 4 },
  logo: { width: 160, height: 48, objectFit: 'contain' },
  qrBox: { alignItems: 'center', marginTop: 6, marginBottom: 4 },
  qrTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
    marginBottom: 8,
    lineHeight: 1.2,
  },
  systemCredit: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#000',
    alignItems: 'center',
  },
  systemCreditName: { fontSize: 8, fontWeight: 'bold', textAlign: 'center', color: '#000' },
  systemCreditLink: { fontSize: 8, textAlign: 'center', color: '#000', marginTop: 2 },
  signatureBlock: { marginTop: 14, alignItems: 'center', width: '100%' },
  signatureSpace: { height: 32, width: '100%' },
  signatureLine: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    width: '92%',
    marginBottom: 4,
  },
  signatureLabel: { fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
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

function formatCnpj(raw: string | null | undefined): string {
  if (!raw) return '---';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return String(raw);
}

/** Mesma lógica da impressão A4: cláusulas numeradas ou texto corrido. */
function termoToSections(htmlContent: string | null | undefined): { title: string; lines: string[] }[] {
  if (!htmlContent) return [];

  let cleanContent = String(htmlContent)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sectionMatches = [...cleanContent.matchAll(/(\d+)\s*-\s*([^:]+):/g)];
  const sections: { title: string; lines: string[] }[] = [];

  sectionMatches.forEach((match, index) => {
    const sectionNumber = match[1];
    const sectionTitle = (match[2] || '').trim();
    const startPos = match.index!;
    let endPos = cleanContent.length;
    if (index + 1 < sectionMatches.length) {
      endPos = sectionMatches[index + 1].index!;
    }
    const rawContent = cleanContent.substring(startPos + match[0].length, endPos).trim();
    const content = rawContent.split(/\n/).map((l) => l.trim()).filter(Boolean);
    sections.push({
      title: `${sectionNumber} - ${sectionTitle}:`,
      lines: content,
    });
  });

  if (sections.length > 0) {
    sections.sort((a, b) => {
      const na = parseInt(a.title, 10);
      const nb = parseInt(b.title, 10);
      return (Number.isNaN(na) ? 0 : na) - (Number.isNaN(nb) ? 0 : nb);
    });
    return sections;
  }

  const lines = cleanContent.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  return [{ title: '', lines }];
}

function getAcompanhamentoUrl(ordemId: string | number): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://gestaoconsert.com.br';
  return `${base}/os/${ordemId}/status`;
}

function CupomValueRow({ desc, amount }: { desc: string; amount: string }) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.valueDescWrap}>
        <Text style={styles.valueDesc}>{desc}</Text>
      </View>
      <Text style={styles.valueAmount}>{amount}</Text>
    </View>
  );
}

export default function OrdemPDFCupom({ ordem }: { ordem: any }) {
  const totalServico = (ordem.qtd_servico || 1) * (ordem.valor_servico || 0);
  const totalPeca = (ordem.qtd_peca || 1) * (ordem.valor_peca || 0);
  const subtotal = totalServico + totalPeca;
  const total = subtotal - (ordem.desconto || 0);
  const emp = ordem.empresas || {};
  const logoSrc = ordem.logo_cupom_preto;
  const acompanhamentoUrl = getAcompanhamentoUrl(ordem.id);

  const termoSections = termoToSections(ordem?.termo_garantia?.conteudo);
  const termoFallback =
    stripHTML(ordem?.termo_garantia?.conteudo) || 'Termo de garantia conforme legislação vigente.';
  const statusTecnicoLabel = getStatusTecnicoLabel(ordem.status, ordem.status_tecnico);

  return (
    <Document>
      <Page size={[CUPOM_WIDTH, PAGE_HEIGHT]} style={styles.page} wrap>
        <View style={styles.logoWrap}>
          {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
        </View>
        <Text style={[styles.center, styles.secondary]}>CNPJ: {formatCnpj(emp.cnpj)}</Text>
        <Text style={[styles.center, styles.bold]}>{emp.endereco || '---'}</Text>
        <Text style={[styles.center, styles.secondary]}>
          {emp.telefone || '---'} {emp.email ? `| ${emp.email}` : ''}
        </Text>
        {emp.website ? <Text style={[styles.center, styles.secondary]}>{emp.website}</Text> : null}
        <View style={styles.line} />

        <View style={styles.row}>
          <Text style={[styles.bold, { fontSize: 11 }]}>OS nº {ordem.numero_os || ordem.id}</Text>
          <Text style={styles.bold}>Entrada: {formatDate(ordem.created_at)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bold}>Prazo: {formatDate(ordem.prazo_entrega)}</Text>
          <Text style={styles.bold}>Status: {ordem.status || '---'}</Text>
        </View>
        <Text style={[styles.bold, { marginTop: 2 }]}>Status técnico: {statusTecnicoLabel}</Text>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block, { fontSize: 11 }]}>CLIENTE</Text>
        <Text style={styles.bold}>{ordem.clientes?.nome || '---'}</Text>
        <Text>
          <Text style={styles.label}>Tel: </Text>
          {ordem.clientes?.telefone || '---'}
        </Text>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block, { fontSize: 11 }]}>EQUIPAMENTO</Text>
        <Text style={[styles.bold, { marginBottom: 4 }]}>
          {ordem.equipamento || '---'} | {ordem.marca || ''} {ordem.modelo || ''}
        </Text>
        <Text style={[styles.block, { marginTop: 4 }]}>
          <Text style={styles.label}>Problema: </Text>
          {(ordem.relato || ordem.problema_relatado || '---').toString().slice(0, 200)}
          {((ordem.relato || ordem.problema_relatado || '').toString().length > 200 ? '...' : '')}
        </Text>
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block, { fontSize: 11 }]}>SERVIÇOS E PEÇAS</Text>
        {ordem.servico && (
          <CupomValueRow
            desc={`${ordem.servico} x${ordem.qtd_servico || 1}`}
            amount={formatMoney(totalServico)}
          />
        )}
        {ordem.peca && (
          <CupomValueRow
            desc={`${ordem.peca} x${ordem.qtd_peca || 1}`}
            amount={formatMoney(totalPeca)}
          />
        )}
        {(ordem.desconto || 0) > 0 && (
          <CupomValueRow desc="Desconto" amount={`-${formatMoney(ordem.desconto)}`} />
        )}
        <View style={styles.valueTotalRow}>
          <View style={styles.valueDescWrap}>
            <Text style={[styles.bold, { fontSize: 12 }]}>TOTAL</Text>
          </View>
          <Text style={styles.valueTotalAmount}>{formatMoney(total)}</Text>
        </View>
        <View style={styles.line} />

        {(emp?.link_publico_ativo ?? true) && (
          <View style={styles.qrBox}>
            <Text style={styles.qrTitle}>Acompanhe sua O.S digital</Text>
            <Image
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(acompanhamentoUrl)}`}
              style={{ width: 72, height: 72 }}
            />
            <Text style={[styles.center, styles.bold, { marginTop: 4 }]}>
              Senha: {ordem.senha_acesso || '---'}
            </Text>
            <Text style={[styles.center, styles.secondary, { marginTop: 2, fontSize: 8 }]}>
              Escaneie o QR code ou acesse o link enviado
            </Text>
          </View>
        )}

        <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: '#000' }}>
          <Text style={styles.termoTitle}>
            {ordem.termo_garantia?.nome || 'Termo de Garantia'}
          </Text>
          {termoSections.length > 0 ? (
            termoSections.map((section, si) => (
              <View key={`ts-${si}`} style={{ marginBottom: 5 }}>
                {section.title ? (
                  <Text style={styles.termoSectionTitle}>{section.title}</Text>
                ) : null}
                {section.lines.map((line, li) => (
                  <Text key={`ts-${si}-l-${li}`} style={styles.termoLine}>
                    {line}
                  </Text>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.termoLine}>{termoFallback}</Text>
          )}
        </View>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureSpace} />
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Nome completo</Text>
        </View>

        <View style={styles.systemCredit}>
          <Text style={styles.systemCreditName}>Gestão Consert</Text>
          <Text style={styles.systemCreditLink}>www.gestaoconsert.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}
