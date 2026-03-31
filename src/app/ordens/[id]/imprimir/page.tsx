'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

import QRCodePDF from '@/components/QRCodePDF';
import ChecklistPDF from '@/components/ChecklistPDF';
import { stripHTML } from '@/lib/utils';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 18,
    paddingHorizontal: 32,
    paddingBottom: 18,
    backgroundColor: '#fff',
    color: '#000',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  logo: {
    height: 64,
    width: 110,
    objectFit: 'contain',
    marginRight: 16,
  },
  companyBlock: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    textAlign: 'left',
    marginTop: 2,
  },
  companyName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyText: {
    fontSize: 11,
    marginBottom: 1,
  },
  osBlock: {
    minWidth: 120,
    alignItems: 'flex-end',
    textAlign: 'right',
    fontSize: 10,
  },
  osText: {
    fontSize: 10,
    marginBottom: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'left',
  },
  block: {
    marginBottom: 6,
  },
  table: {
    width: '100%',
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableRowHeader: {
    backgroundColor: '#eee',
  },
  tableCell: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderStyle: 'solid',
    padding: 2,
    fontSize: 10,
    width: '20%',
  },
  tableCellLeftAlign: {
    textAlign: 'left',
  },
  tableCellCenterAlign: {
    textAlign: 'center',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  signatureBox: {
    textAlign: 'center',
    flex: 1,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    width: 140,
    marginHorizontal: 'auto',
    marginBottom: 2,
  },
  signatureText: {
    fontSize: 10,
  },
  qrBox: {
    alignItems: 'flex-end',
    flex: 1,
  },
  paragraph: {
    marginBottom: 4,
    fontSize: 10,
  },
  bold: {
    fontWeight: 'bold',
  },
});

/** Usa data URLs (imagens_pdf) se houver pelo menos uma; senão usa as URLs originais para o PDF tentar carregar. */
function getImagensParaPdf(pdfField: string | null | undefined, urlField: string | null | undefined): string {
  if (!urlField && !pdfField) return '';
  if (!pdfField || typeof pdfField !== 'string') return (urlField as string) || '';
  const t = pdfField.trim();
  if (!t || t === '[]') return (urlField as string) || '';
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t);
      if (!Array.isArray(arr) || arr.length === 0) return (urlField as string) || '';
      const hasDataUrl = arr.some((x: unknown) => typeof x === 'string' && x.startsWith('data:image/'));
      if (!hasDataUrl) return (urlField as string) || '';
      return pdfField;
    } catch {
      return (urlField as string) || '';
    }
  }
  return pdfField;
}

function OrdemPDF({ ordem, checklistItens }: { ordem: any; checklistItens: any[] }) {
  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '---';
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  }
  function formatDateTimeFromMs(ms: number | null) {
    if (!ms || !Number.isFinite(ms)) return '---';
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return '---';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }
  function formatMoney(val: any) {
    if (val == null) return '---';
    return `R$ ${Number(val).toFixed(2)}`;
  }

  function formatFormaPagamento(fp: string | null | undefined): string {
    if (!fp || typeof fp !== 'string') return '—';
    const t = fp.trim().toLowerCase().replace(/_/g, ' ');
    const map: Record<string, string> = {
      dinheiro: 'Dinheiro',
      'cartao credito': 'Cartão de crédito',
      'cartao debito': 'Cartão de débito',
      pix: 'PIX',
      boleto: 'Boleto',
      'cartao': 'Cartão',
      credito: 'Crédito',
      debito: 'Débito',
    };
    return map[t] || t.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function extractTimestampMsFromUrl(rawUrl: string): number | null {
    const s = String(rawUrl || '').trim();
    if (!s) return null;
    let path = s;
    try {
      const u = new URL(s);
      path = decodeURIComponent(u.pathname);
    } catch {
      path = s;
    }
    const m13 = path.match(/(?:^|\/)(\d{13})(?:[_-])/);
    if (m13) return Number(m13[1]);
    const m10 = path.match(/(?:^|\/)(\d{10})(?:[_-])/);
    if (m10) return Number(m10[1]) * 1000;
    return null;
  }

  function renderImagens(
    imagens: string | null | undefined,
    titulo: string,
    opts?: { size?: number; max?: number },
    imagensOriginal?: string | null | undefined
  ) {
    if (!imagens || typeof imagens !== 'string') return null;
    
    const size = opts?.size ?? 80;
    const max = opts?.max ?? 4;

    // `imagens` pode vir como CSV (URLs separadas por vírgula) OU como JSON array
    // (necessário para suportar `data:image/...` que contém vírgulas).
    const rawList: string[] = (() => {
      const t = String(imagens).trim();
      if (!t) return [];
      if (t.startsWith('[')) {
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) return parsed.map((v) => String(v));
        } catch {
          // cai no split por vírgula
        }
      }
      return t.split(',');
    })();

    // No react-pdf, <Image> com URL HTTP costuma falhar (CORS/worker). Só usar data URLs.
    const imageUrls = Array.from(
      new Set(
        rawList
          .map((url: string) => url.trim())
          .filter((url: string) => url !== '' && url !== 'null' && url !== 'undefined')
          .filter((url: string) => /^data:image\//i.test(url) || /^https?:\/\//i.test(url))
      )
    );

    const originalUrls =
      typeof imagensOriginal === 'string'
        ? imagensOriginal
            .split(',')
            .map((url: string) => url.trim())
            .filter((url: string) => url !== '' && url !== 'null' && url !== 'undefined')
        : [];
    
    if (imageUrls.length === 0) return null;
    
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{titulo}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {imageUrls.slice(0, max).map((imageUrl, index) => {
            const originalUrlForDate = originalUrls[index] || imageUrl;
            const ts = extractTimestampMsFromUrl(originalUrlForDate);
            const dt = formatDateTimeFromMs(ts);
            const isDataUrl = /^data:image\//i.test(imageUrl);
            const src = isDataUrl ? imageUrl.trim() : (encodeURI(imageUrl.trim()) as string);
            return (
              <View key={index} style={{ width: size, marginRight: 8, marginBottom: 8 }}>
                {isDataUrl ? (
                  <Image
                    src={src}
                    style={{
                      width: size,
                      height: size,
                      objectFit: 'cover',
                      borderWidth: 1,
                      borderColor: '#ddd',
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: size,
                      height: size,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      backgroundColor: '#f0f0f0',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 8, color: '#999' }}>?</Text>
                  </View>
                )}
                <Text style={{ fontSize: 7, color: '#666', marginTop: 2, textAlign: 'center' }}>
                  {dt}
                </Text>
              </View>
            );
          })}
        </View>
        {imageUrls.length > max && (
          <Text style={[styles.paragraph, { fontSize: 8, color: '#666', marginTop: 4 }]}>
            +{imageUrls.length - max} {imageUrls.length - max === 1 ? 'imagem adicional' : 'imagens adicionais'}
          </Text>
        )}
      </View>
    );
  }

  function renderTermoClean(htmlContent: string) {
    if (!htmlContent) return null;

    // Remove tags HTML mas preserva quebras (br e fechamento de block viram \n)
    let cleanContent = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Encontra todas as cláusulas no formato "1 - TÍTULO:" (obrigatório dois-pontos para garantir corte correto)
    const sectionMatches = [...cleanContent.matchAll(/(\d+)\s*-\s*([^:]+):/g)];
    const sections: any[] = [];

    sectionMatches.forEach((match, index) => {
      const sectionNumber = match[1];
      const sectionTitle = (match[2] || '').trim();
      const startPos = match.index!;
      let endPos = cleanContent.length;
      if (index + 1 < sectionMatches.length) {
        endPos = sectionMatches[index + 1].index!;
      }
      const rawContent = cleanContent.substring(startPos + match[0].length, endPos).trim();
      // Quebra em linhas/parágrafos; linhas vazias viram separação de parágrafo
      const content = rawContent.split(/\n/).map((l) => l.trim()).filter(Boolean);

      sections.push({
        number: parseInt(sectionNumber, 10),
        title: `${sectionNumber} - ${sectionTitle}:`,
        content,
        key: `section-${sectionNumber}-${index}`,
      });
    });

    sections.sort((a, b) => a.number - b.number);

    return (
      <View>
        {sections.map((section) => (
          <View key={section.key} style={{ marginBottom: 6 }}>
            <Text style={[styles.paragraph, { fontSize: 8, fontWeight: 'bold', color: '#000', marginBottom: 2 }]}>
              {section.title}
            </Text>
            {section.content.map((contentLine: string, contentIndex: number) => (
              <Text key={`${section.key}-c-${contentIndex}`} style={[styles.paragraph, { fontSize: 7, lineHeight: 1.3, color: '#333', marginBottom: 1 }]}>
                {contentLine}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.headerRow}>
          <Image src={ordem.empresas?.logo_url || '/logo.png'} style={styles.logo} />
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{ordem.empresas?.nome}</Text>
            <Text style={styles.companyText}>CNPJ: {ordem.empresas?.cnpj}</Text>
            <Text style={styles.companyText}>{ordem.empresas?.endereco}</Text>
            <Text style={styles.companyText}>{ordem.empresas?.telefone} - {ordem.empresas?.email}</Text>
          </View>
          <View style={styles.osBlock}>
            <Text style={styles.osText}>Número da OS: {ordem.numero_os || ordem.id}</Text>
            <Text style={styles.osText}>Entrada: {formatDate(ordem.created_at)}</Text>
            <Text style={styles.osText}>Prazo de Entrega: {formatDate(ordem.prazo_entrega)}</Text>
            {ordem.status !== 'ORÇAMENTO' && (
              <>
                <Text style={styles.osText}>Data de Entrega: {formatDate(ordem.data_entrega)}</Text>
                <Text style={styles.osText}>Venc. Garantia: {formatDate(ordem.vencimento_garantia)}</Text>
              </>
            )}
            <Text style={styles.osText}>Status: {ordem.status}</Text>
            {String(ordem.status || '').toUpperCase() === 'ENTREGUE' && (
              <Text style={styles.osText}>Forma de pagamento: {formatFormaPagamento(ordem.forma_pagamento)}</Text>
            )}
          </View>
        </View>
        <View style={styles.divider} />

        {/* Cliente + QR code no topo (QR e senha só quando link público ativo) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Dados do Cliente</Text>
            <Text style={styles.paragraph}><Text style={styles.bold}>Nome:</Text> {ordem.clientes?.nome}   <Text style={styles.bold}>Telefone:</Text> {ordem.clientes?.telefone}</Text>
            <Text style={styles.paragraph}><Text style={styles.bold}>CPF:</Text> {ordem.clientes?.cpf}   <Text style={styles.bold}>Endereço:</Text> {ordem.clientes?.endereco}</Text>
            <Text style={styles.paragraph}><Text style={styles.bold}>Atendente:</Text> {ordem.atendente || 'Não informado'}</Text>
          </View>
          {(ordem.empresas?.link_publico_ativo ?? true) && (
            <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(`https://gestaoconsert.com.br/os/${ordem.id}/login`)}`}
                style={{ width: 60, height: 60 }}
              />
              <Text style={{ fontSize: 8, textAlign: 'center', marginTop: 2, color: '#666' }}>
                Acompanhar OS
              </Text>
              <Text style={{ fontSize: 10, textAlign: 'center', marginTop: 4, color: '#000', fontWeight: 'bold' }}>
                Senha: {ordem.senha_acesso || '1234'}
              </Text>
            </View>
          )}
        </View>

        {/* Aparelho */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Aparelho</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Equipamento:</Text> {ordem.equipamento}   <Text style={styles.bold}>Marca:</Text> {ordem.marca}   <Text style={styles.bold}>Modelo:</Text> {ordem.modelo}</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Cor:</Text> {ordem.cor}   <Text style={styles.bold}>Nº Série:</Text> {ordem.numero_serie}</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Acessórios:</Text> {ordem.acessorios || '---'}</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Condições:</Text> {ordem.condicoes_equipamento || '---'}</Text>
        </View>

        {/* Checklist de Entrada */}
        <ChecklistPDF checklistData={ordem.checklist_entrada} checklistItens={checklistItens} styles={styles} />

        {/* Informações de Acesso */}
        {(ordem.senha_aparelho || ordem.senha_padrao) && (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Informações de Acesso</Text>
            {ordem.senha_aparelho && (
              <Text style={styles.paragraph}><Text style={styles.bold}>Senha do Aparelho:</Text> {ordem.senha_aparelho}</Text>
            )}
            {ordem.senha_padrao && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.paragraph, { marginBottom: 8 }]}><Text style={styles.bold}>Padrão de Desenho:</Text></Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    width: 60, 
                    gap: 4 
                  }}>
                    {Array.from({ length: 9 }, (_, index) => {
                      const pattern = JSON.parse(ordem.senha_padrao);
                      const isSelected = pattern.includes(index);
                      const sequenceNumber = isSelected ? pattern.indexOf(index) + 1 : null;
                      return (
                        <View
                          key={index}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: isSelected ? '#000' : '#ccc',
                            backgroundColor: isSelected ? '#000' : '#f5f5f5',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {isSelected && (
                            <Text style={{ 
                              color: '#fff', 
                              fontSize: 8, 
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}>
                              {sequenceNumber}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Relato do Cliente */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Relato do Cliente</Text>
          <Text style={styles.paragraph}>{ordem.relato}</Text>
        </View>

        {/* Técnicos / Responsáveis */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Equipe</Text>
          <Text style={styles.paragraph}><Text style={styles.bold}>Técnico:</Text> {ordem.tecnico?.nome || 'N/A'}</Text>
        </View>

        {/* Laudo Técnico - só exibe se houver texto real após remover HTML */}
        {(() => {
          const laudoTexto = ordem.laudo != null ? stripHTML(String(ordem.laudo)).trim() : '';
          if (!laudoTexto) return null;
          return (
            <View style={styles.block}>
              <Text style={styles.sectionTitle}>Laudo Técnico</Text>
              <Text style={styles.paragraph}>{laudoTexto}</Text>
            </View>
          );
        })()}

        {/* Serviços e Peças (por último) */}
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Serviços e Peças</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableRowHeader]}>
              <Text style={[styles.tableCell, styles.tableCellLeftAlign, { flex: 3 }]}>Item</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 1 }]}>Qtd</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>Valor Unit.</Text>
              <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>Subtotal</Text>
            </View>
            {ordem.servico && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellLeftAlign, { flex: 3 }]}>{ordem.servico}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 1 }]}>{String(ordem.qtd_servico ?? 1)}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>{formatMoney(ordem.valor_servico)}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>{formatMoney((ordem.qtd_servico ?? 1) * (ordem.valor_servico ?? 0))}</Text>
              </View>
            )}
            {ordem.peca && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellLeftAlign, { flex: 3 }]}>{ordem.peca}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 1 }]}>{String(ordem.qtd_peca ?? 1)}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>{formatMoney(ordem.valor_peca)}</Text>
                <Text style={[styles.tableCell, styles.tableCellCenterAlign, { flex: 2 }]}>{formatMoney((ordem.qtd_peca ?? 1) * (ordem.valor_peca ?? 0))}</Text>
              </View>
            )}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 8, borderRightWidth: 0, textAlign: 'right', fontWeight: 'bold' }]}>Subtotal:</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>{formatMoney(((ordem.qtd_servico ?? 1) * (ordem.valor_servico ?? 0)) + ((ordem.qtd_peca ?? 1) * (ordem.valor_peca ?? 0)))}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 8, borderRightWidth: 0, textAlign: 'right', fontWeight: 'bold' }]}>Desconto:</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>{formatMoney(ordem.desconto)}</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 8, borderRightWidth: 0, textAlign: 'right', fontWeight: 'bold' }]}>Total:</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}> {formatMoney((((ordem.qtd_servico ?? 1) * (ordem.valor_servico ?? 0)) + ((ordem.qtd_peca ?? 1) * (ordem.valor_peca ?? 0))) - (ordem.desconto ?? 0))}</Text>
            </View>
            {ordem.valor_faturado && ordem.valor_faturado > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 8, borderRightWidth: 0, textAlign: 'right', fontWeight: 'bold' }]}>Valor Faturado:</Text>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', fontWeight: 'bold' }]}>{formatMoney(ordem.valor_faturado)}</Text>
              </View>
            )}
            {String(ordem.status || '').toUpperCase() === 'ENTREGUE' && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 8, borderRightWidth: 0, textAlign: 'right', fontWeight: 'bold' }]}>Forma de pagamento:</Text>
                <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>{formatFormaPagamento(ordem.forma_pagamento)}</Text>
              </View>
            )}
          </View>
        </View>
      </Page>

      {/* 2ª folha: Imagens do Técnico + Termo */}
      <Page size="A4" style={styles.page}>
        {/* Imagens de Entrada (Atendente) - 2ª folha. Usa URLs se não houver data URLs. */}
        {renderImagens(
          getImagensParaPdf((ordem as any).imagens_pdf, ordem.imagens),
          'Imagens de Entrada (Atendente)',
          { size: 110, max: 30 },
          ordem.imagens
        )}

        {/* Imagens do Técnico. Usa URLs se não houver data URLs. */}
        {renderImagens(
          getImagensParaPdf((ordem as any).imagens_tecnico_pdf, (ordem as any).imagens_tecnico),
          'Imagens do Técnico',
          { size: 110, max: 30 },
          (ordem as any).imagens_tecnico
        )}

        {/* Termo de Garantia */}
        <View style={[styles.block, { padding: 8, backgroundColor: '#fafafa' }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 4, textAlign: 'center', fontSize: 12 }]}>
            {ordem.termo_garantia?.nome || 'Termo de Garantia'}
          </Text>
          
          {/* Layout em 2 colunas otimizado */}
          <View style={{ width: '100%', paddingTop: 2 }}>
            {renderTermoClean(ordem.termo_garantia?.conteudo || 'Termo de garantia padrão aplicável conforme legislação vigente.')}
          </View>
        </View>

        {/* Assinaturas no rodapé (na 2ª folha) */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureText}>Assinatura do Cliente</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine}></View>
            <Text style={styles.signatureText}>Assinatura da Empresa</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default function ImprimirOrdemPage() {
  const { id } = useParams();
  const [ordem, setOrdem] = useState<any>(null);
  const [checklistItens, setChecklistItens] = useState<any[]>([]);
  const [PDFViewer, setPDFViewer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /** Carrega heic2any do CDN (sem npm) para converter HEIC → JPEG no navegador. */
  function loadHeic2any(): Promise<(opts: { blob: Blob; toType?: string }) => Promise<Blob | Blob[]>> {
    const w = typeof window === 'undefined' ? null : (window as any);
    if (!w) return Promise.reject(new Error('no window'));
    if (w.__heic2any) return Promise.resolve(w.__heic2any);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js';
      s.onload = () => {
        w.__heic2any = w.heic2any;
        resolve(w.heic2any);
      };
      s.onerror = () => reject(new Error('Falha ao carregar heic2any'));
      document.head.appendChild(s);
    });
  }

  function isHeicDataUrl(s: string): boolean {
    return typeof s === 'string' && /^data:image\/(heic|heif)/i.test(s);
  }

  async function convertHeicDataUrlToJpeg(dataUrl: string, heic2anyFn: (opts: { blob: Blob; toType?: string }) => Promise<Blob | Blob[]>): Promise<string> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const result = await heic2anyFn({ blob, toType: 'image/jpeg' });
    const outBlob = Array.isArray(result) ? result[0] : result;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(outBlob);
    });
  }

  /** Quando a API não retorna data URLs, busca cada imagem via proxy no cliente e monta os arrays. */
  async function preencherImagensPdfPeloCliente(ordemFromApi: any): Promise<any> {
    let imagens_pdf = ordemFromApi.imagens_pdf;
    let imagens_tecnico_pdf = ordemFromApi.imagens_tecnico_pdf;

    const hasDataUrls = (s: string | null | undefined) => {
      if (!s || typeof s !== 'string') return false;
      const t = s.trim();
      if (!t || t === '[]') return false;
      if (t.startsWith('[')) {
        try {
          const arr = JSON.parse(t);
          return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string';
        } catch {
          return false;
        }
      }
      return false;
    };

    if (!hasDataUrls(imagens_pdf) && ordemFromApi.imagens) {
      imagens_pdf = await prepareImagesForPdf(ordemFromApi.imagens, 30);
    }
    if (!hasDataUrls(imagens_tecnico_pdf) && ordemFromApi.imagens_tecnico) {
      imagens_tecnico_pdf = await prepareImagesForPdf(ordemFromApi.imagens_tecnico, 30);
    }

    if (imagens_pdf === ordemFromApi.imagens_pdf && imagens_tecnico_pdf === ordemFromApi.imagens_tecnico_pdf) {
      return ordemFromApi;
    }
    return { ...ordemFromApi, imagens_pdf, imagens_tecnico_pdf, laudo: ordemFromApi.laudo };
  }

  /** Tamanho máximo do lado maior da imagem no PDF (evita payload gigante e bugs do react-pdf). */
  const MAX_IMAGE_DIM = 400;

  /**
   * Converte qualquer data URL de imagem para PNG e redimensiona para caber em MAX_IMAGE_DIM.
   * Evita o erro "Unknown version" do react-pdf com JPEG/WebP e reduz tamanho do base64.
   */
  async function dataUrlToPng(dataUrl: string): Promise<string | null> {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    const trimmed = dataUrl.trim();
    if (trimmed.startsWith('data:image/png;base64,')) {
      // Já é PNG; opcionalmente redimensionar se for muito grande
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const w = img.naturalWidth;
            const h = img.naturalHeight;
            if (w <= MAX_IMAGE_DIM && h <= MAX_IMAGE_DIM) {
              resolve(trimmed);
              return;
            }
            const scale = MAX_IMAGE_DIM / Math.max(w, h);
            const cw = Math.round(w * scale);
            const ch = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(trimmed);
              return;
            }
            ctx.drawImage(img, 0, 0, cw, ch);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(trimmed);
          }
        };
        img.onerror = () => resolve(trimmed);
        img.src = trimmed;
      });
    }
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(w, h, 1));
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          const canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, cw, ch);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = trimmed;
    });
  }

  /** Normaliza todas as imagens (data URLs) para PNG para evitar bug do react-pdf com JPEG. */
  async function normalizeImagensToPng(ordemFromApi: any): Promise<any> {
    if (!ordemFromApi?.imagens_pdf && !ordemFromApi?.imagens_tecnico_pdf) return ordemFromApi;
    const convertArray = async (jsonStr: string | null): Promise<string> => {
      if (!jsonStr || typeof jsonStr !== 'string') return jsonStr || '';
      let arr: string[];
      try {
        arr = JSON.parse(jsonStr);
      } catch {
        return jsonStr;
      }
      if (!Array.isArray(arr)) return jsonStr;
      const out = await Promise.all(
        arr.map(async (item: string) => {
          if (typeof item !== 'string' || !item.startsWith('data:image/')) return item;
          const png = await dataUrlToPng(item);
          return png || item;
        })
      );
      return JSON.stringify(out);
    };
    return {
      ...ordemFromApi,
      imagens_pdf: await convertArray(ordemFromApi.imagens_pdf),
      imagens_tecnico_pdf: await convertArray(ordemFromApi.imagens_tecnico_pdf),
    };
  }

  /** Converte data URLs HEIC em imagens_pdf e imagens_tecnico_pdf para JPEG no navegador. */
  async function convertHeicInOrdem(ordemFromApi: any): Promise<any> {
    if (!ordemFromApi.imagens_pdf && !ordemFromApi.imagens_tecnico_pdf) return ordemFromApi;
    try {
      const heic2anyFn = await loadHeic2any();
      const convertArray = async (jsonStr: string | null): Promise<string> => {
        if (!jsonStr || typeof jsonStr !== 'string') return jsonStr || '';
        let arr: string[];
        try {
          arr = JSON.parse(jsonStr);
        } catch {
          return jsonStr;
        }
        if (!Array.isArray(arr)) return jsonStr;
        const out = await Promise.all(
          arr.map(async (item: string) => {
            if (typeof item !== 'string' || !isHeicDataUrl(item)) return item;
            try {
              return await convertHeicDataUrlToJpeg(item, heic2anyFn);
            } catch {
              return item;
            }
          })
        );
        return JSON.stringify(out);
      };
      return {
        ...ordemFromApi,
        imagens_pdf: await convertArray(ordemFromApi.imagens_pdf),
        imagens_tecnico_pdf: await convertArray(ordemFromApi.imagens_tecnico_pdf),
      };
    } catch (e) {
      console.warn('Conversão HEIC no navegador falhou:', e);
      return ordemFromApi;
    }
  }

  async function urlToDataUrl(url: string): Promise<string | null> {
    try {
      // Tentar via proxy no servidor primeiro (evita CORS e bucket privado)
      const supabaseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SUPABASE_URL || '') : '';
      let isSupabase = false;
      if (supabaseUrl) {
        try {
          isSupabase = url.includes(new URL(supabaseUrl).hostname);
        } catch {
          isSupabase = url.includes('supabase');
        }
      }
      if (isSupabase && typeof window !== 'undefined') {
        const proxyRes = await fetch(
          `/api/ordens/imagem-proxy?url=${encodeURIComponent(url.trim())}`,
          { cache: 'no-store' }
        );
        if (proxyRes.ok) {
          const json = await proxyRes.json().catch(() => null);
          if (json?.dataUrl && typeof json.dataUrl === 'string' && json.dataUrl.startsWith('data:image/')) {
            return json.dataUrl;
          }
        }
      }
      // Fallback: fetch direto (pode falhar por CORS em bucket privado)
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.type || !blob.type.startsWith('image/')) return null;
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function prepareImagesForPdf(imagens: string | null | undefined, limit = 30): Promise<string> {
    if (!imagens || typeof imagens !== 'string') return '';
    const urls = imagens
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u && u !== 'null' && u !== 'undefined')
      .filter((u) => /^https?:\/\//i.test(u));

    const unique = Array.from(new Set(urls)).slice(0, limit);

    // Busca cada imagem via proxy (data URL). Se falhar, mantém a URL para o PDF tentar carregar.
    const resolved = await Promise.all(
      unique.map(async (u) => {
        const dataUrl = await urlToDataUrl(u.trim());
        return dataUrl || u.trim();
      })
    );
    const valid = resolved.filter((r): r is string => typeof r === 'string' && (r.startsWith('data:image/') || /^https?:\/\//i.test(r)));
    return JSON.stringify(valid);
  }

  useEffect(() => {
    async function fetchOrdem() {
      if (!id) {
        console.error('ID da OS não fornecido');
        setError('ID da OS não fornecido');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/ordens/${id}/dados-impressao`, { cache: 'no-store' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData?.error || `Erro ${res.status} ao carregar OS`);
          setLoading(false);
          return;
        }
        const { ordem: ordemFromApi, checklistItens: checklistFromApi } = await res.json();
        if (!ordemFromApi) {
          setError('OS não encontrada');
          setLoading(false);
          return;
        }
        // Se a API não trouxe data URLs, busca imagens via proxy no cliente
        const ordemComImagens = await preencherImagensPdfPeloCliente(ordemFromApi);
        // Converte HEIC (iPhone) para JPEG no navegador (heic2any via CDN, sem npm)
        const ordemComHeicConvertido = await convertHeicInOrdem(ordemComImagens);
        // Normaliza todas as imagens para PNG (evita "Unknown version" do react-pdf com JPEG)
        const ordemComPng = await normalizeImagensToPng(ordemComHeicConvertido);
        setOrdem(ordemComPng);
        setChecklistItens(checklistFromApi || []);
      } catch (err: any) {
        setError(err?.message || 'Erro ao conectar');
      } finally {
        setLoading(false);
      }
    }

    fetchOrdem();
  }, [id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carregar PDFViewer com retry (evita ChunkLoadError após rebuild/cache)
  useEffect(() => {
    let cancelled = false;
    const load = (attempt = 1) => {
      import('@react-pdf/renderer')
        .then((mod) => {
          if (!cancelled) setPDFViewer(() => mod.PDFViewer);
        })
        .catch((err) => {
          if (cancelled) return;
          const isChunk = err?.name === 'ChunkLoadError' || /ChunkLoadError|Loading chunk/i.test(String(err?.message));
          if (isChunk && attempt < 3) {
            setTimeout(() => load(attempt + 1), 800 * attempt);
          } else {
            console.warn('Falha ao carregar visualizador PDF:', err);
          }
        });
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar a OS</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button 
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Voltar
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!PDFViewer || !ordem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Preparando impressão...</p>
          <p className="text-gray-500 text-sm mt-2">
            {!PDFViewer ? 'Carregando visualizador PDF...' : 'Carregando dados da OS...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    
      <PDFViewer style={{ width: '100vw', height: '100vh' }}>
        <OrdemPDF ordem={ordem} checklistItens={checklistItens} />
      </PDFViewer>
    
  );
}