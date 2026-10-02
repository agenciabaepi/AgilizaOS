import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
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

/** Documento completo da O.S. (impressão e envio pelo WhatsApp). Imagens precisam vir como data URL. */
export function OrdemPDF({ ordem, checklistItens }: { ordem: any; checklistItens: any[] }) {
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
          {ordem.empresas?.logo_url ? <Image src={ordem.empresas.logo_url} style={styles.logo} /> : null}
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
