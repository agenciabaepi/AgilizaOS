'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// 80 mm ≈ 227 pt; altura A4 para permitir fluxo com wrap (várias “folhas” no PDF)
const CUPOM_WIDTH = 227;
const PAGE_HEIGHT = 842;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#000',
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

function formatCnpj(raw: string | null | undefined): string {
  if (!raw) return '---';
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return String(raw);
}

/** Parse seguro do JSON de senha_padrao (índices 0–8). */
function parseSenhaPadrao(raw: unknown): number[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw.filter((n) => typeof n === 'number' && n >= 0 && n < 9);
  try {
    const p = JSON.parse(String(raw));
    return Array.isArray(p) ? p.filter((n: unknown) => typeof n === 'number' && n >= 0 && n < 9) : [];
  } catch {
    return [];
  }
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

function PatternGridCupom({ pattern }: { pattern: number[] }) {
  const hasPath = pattern.length > 0;
  const rows = [0, 1, 2].map((row) => (
    <View key={row} style={{ flexDirection: 'row', marginBottom: 3, justifyContent: 'center' }}>
      {[0, 1, 2].map((col) => {
        const index = row * 3 + col;
        const isSelected = hasPath && pattern.includes(index);
        const sequenceNumber = isSelected ? pattern.indexOf(index) + 1 : null;
        const isLastCol = col === 2;
        return (
          <View
            key={index}
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              borderWidth: 1,
              borderStyle: hasPath ? 'solid' : 'dashed',
              borderColor: isSelected ? '#000' : '#888',
              backgroundColor: isSelected ? '#000' : '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: isLastCol ? 0 : 4,
            }}
          >
            {isSelected && sequenceNumber != null ? (
              <Text style={{ color: '#fff', fontSize: 7, fontWeight: 'bold' }}>{sequenceNumber}</Text>
            ) : !hasPath ? (
              <Text style={{ fontSize: 5, color: '#ccc' }}> </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  ));

  return (
    <View style={{ alignItems: 'center', marginTop: 4, marginBottom: 4 }}>
      {!hasPath && (
        <Text style={{ fontSize: 6, color: '#555', marginBottom: 4, textAlign: 'center' }}>
          Preencha à mão o desenho de desbloqueio, se o cliente usar padrão Android
        </Text>
      )}
      <View>{rows}</View>
    </View>
  );
}

export default function OrdemPDFCupom({ ordem }: { ordem: any }) {
  const totalServico = (ordem.qtd_servico || 1) * (ordem.valor_servico || 0);
  const totalPeca = (ordem.qtd_peca || 1) * (ordem.valor_peca || 0);
  const subtotal = totalServico + totalPeca;
  const total = subtotal - (ordem.desconto || 0);
  const emp = ordem.empresas || {};
  const pattern = parseSenhaPadrao(ordem.senha_padrao);

  const termoSections = termoToSections(ordem?.termo_garantia?.conteudo);
  const termoFallback =
    stripHTML(ordem?.termo_garantia?.conteudo) || 'Termo de garantia conforme legislação vigente.';

  return (
    <Document>
      <Page size={[CUPOM_WIDTH, PAGE_HEIGHT]} style={styles.page} wrap>
        <Text style={[styles.center, styles.bold, { fontSize: 11 }]}>{emp.nome || '---'}</Text>
        <Text style={[styles.center, { fontSize: 7 }]}>CNPJ: {formatCnpj(emp.cnpj)}</Text>
        <Text style={[styles.center]}>{emp.endereco || '---'}</Text>
        <Text style={[styles.center]}>
          {emp.telefone || '---'} {emp.email ? `| ${emp.email}` : ''}
        </Text>
        {emp.website ? <Text style={[styles.center, { fontSize: 7 }]}>{emp.website}</Text> : null}
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
        <Text>
          {ordem.equipamento || '---'} | {ordem.marca || ''} {ordem.modelo || ''}
        </Text>
        <Text style={styles.block}>
          Problema: {(ordem.relato || ordem.problema_relatado || '---').toString().slice(0, 200)}
          {((ordem.relato || ordem.problema_relatado || '').toString().length > 200 ? '...' : '')}
        </Text>

        <Text style={[styles.bold, { marginTop: 4 }]}>Acesso ao aparelho</Text>
        {ordem.senha_aparelho ? (
          <Text style={styles.block}>
            <Text style={styles.bold}>Senha / PIN: </Text>
            {String(ordem.senha_aparelho)}
          </Text>
        ) : null}
        <Text style={[styles.bold, { fontSize: 7, marginTop: 2 }]}>Padrão Android</Text>
        <PatternGridCupom pattern={pattern} />
        <View style={styles.line} />

        <Text style={[styles.bold, styles.block]}>SERVIÇOS E PEÇAS</Text>
        {ordem.servico && (
          <View style={styles.row}>
            <Text>
              {ordem.servico} x{ordem.qtd_servico || 1}
            </Text>
            <Text>{formatMoney(totalServico)}</Text>
          </View>
        )}
        {ordem.peca && (
          <View style={styles.row}>
            <Text>
              {ordem.peca} x{ordem.qtd_peca || 1}
            </Text>
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

        {(emp?.link_publico_ativo ?? true) && (
          <View>
            <Text style={[styles.center, styles.mt]}>Senha para acompanhar: {ordem.senha_acesso || '---'}</Text>
            <Text style={[styles.center, { fontSize: 7, color: '#666', marginTop: 2 }]}>
              acesse o link enviado ou informe a senha
            </Text>
          </View>
        )}

        <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#ccc' }}>
          <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' }}>
            {ordem.termo_garantia?.nome || 'Termo de Garantia'} (texto completo)
          </Text>
          {termoSections.length > 0 ? (
            termoSections.map((section, si) => (
              <View key={`ts-${si}`} style={{ marginBottom: 5 }}>
                {section.title ? (
                  <Text style={{ fontSize: 6, fontWeight: 'bold', marginBottom: 2 }}>{section.title}</Text>
                ) : null}
                {section.lines.map((line, li) => (
                  <Text
                    key={`ts-${si}-l-${li}`}
                    style={{ fontSize: 5, lineHeight: 1.35, color: '#222', marginBottom: 1 }}
                  >
                    {line}
                  </Text>
                ))}
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 5, lineHeight: 1.35, color: '#222' }}>{termoFallback}</Text>
          )}
        </View>

        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#000', paddingTop: 8, alignItems: 'center' }}>
          <Text style={{ fontSize: 7 }}>_________________________________________</Text>
          <Text style={{ fontSize: 7, marginTop: 2 }}>Assinatura do Cliente</Text>
        </View>
      </Page>
    </Document>
  );
}
