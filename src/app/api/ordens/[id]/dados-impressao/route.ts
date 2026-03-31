import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'ordens-imagens';

function getStoragePathFromUrl(fullUrl: string): string | null {
  try {
    const decoded = decodeURIComponent(fullUrl);
    const idx = decoded.indexOf('ordens-imagens/');
    if (idx === -1) return null;
    const after = decoded.slice(idx + 'ordens-imagens/'.length);
    const path = after.split('?')[0].trim().replace(/^\/+|\/+$/g, '');
    return path || null;
  } catch {
    return null;
  }
}

function isHeic(path: string, mimeType: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return (
    ext === 'heic' ||
    ext === 'heif' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif'
  );
}

/** Detecta HEIC pelos primeiros bytes (ftyp + mif1/heix/heic/hevc). */
function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp !== 'ftyp') return false;
  const brand = buffer.toString('ascii', 8, 12);
  return /^(mif1|heix|heic|hevc|msf1)/.test(brand);
}

/**
 * Tenta buscar a imagem pela URL pública (mesmo fluxo que a página de visualização).
 * Usado como fallback quando o download pelo Storage falha.
 */
async function fetchImageAsDataUrl(fullUrl: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(fullUrl.trim(), {
      headers: { Accept: 'image/*' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let type = res.headers.get('content-type')?.split(';')[0]?.trim() || '';
    if (!type.startsWith('image/')) {
      const ext = path.split('.').pop()?.toLowerCase();
      type =
        ext === 'png'
          ? 'image/png'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'heic' || ext === 'heif'
                ? 'image/heic'
                : 'image/jpeg';
    }
    // HEIC é retornado como data URL; a página de impressão converte para JPEG no navegador (heic2any via CDN)
    return `data:${type};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function urlToDataUrlServer(
  url: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const trimmed = url.trim();
  try {
    const path = getStoragePathFromUrl(trimmed);
    let buffer: Buffer;
    let type: string;

    // 1) Tentar download pelo Storage (service role)
    const { data, error } = path
      ? await supabase.storage.from(BUCKET).download(path)
      : { data: null, error: new Error('path vazio') };

    if (!error && data) {
      const arrayBuffer = await data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      type = (data.type || '').trim();
      if (!type.startsWith('image/') || type === 'image/heic' || type === 'image/heif') {
        const ext = (path || '').split('.').pop()?.toLowerCase();
        if (ext === 'heic' || ext === 'heif' || isHeicBuffer(buffer)) {
          type = 'image/heic';
        } else {
          type =
            ext === 'png'
              ? 'image/png'
              : ext === 'gif'
                ? 'image/gif'
                : ext === 'webp'
                  ? 'image/webp'
                  : 'image/jpeg';
        }
      }
    } else {
      // 2) Fallback: URL assinada (bucket privado) e depois fetch
      if (path) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (signed?.signedUrl) {
          const dataUrl = await fetchImageAsDataUrl(signed.signedUrl, path);
          if (dataUrl) return dataUrl;
        }
      }
      // 3) Fallback: buscar pela URL original (bucket público)
      const dataUrl = await fetchImageAsDataUrl(trimmed, path || '');
      return dataUrl;
    }

    // HEIC é retornado como data URL; a página de impressão converte para JPEG no navegador (heic2any via CDN)
    return `data:${type};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

async function prepareImagesForPdfServer(
  imagens: string | null | undefined,
  supabase: SupabaseClient,
  limit = 30
): Promise<string> {
  if (!imagens || typeof imagens !== 'string') return '';
  const urls = imagens
    .split(',')
    .map((u) => u.trim())
    .filter((u) => u && u !== 'null' && u !== 'undefined')
    .filter((u) => /^https?:\/\//i.test(u));
  const unique = Array.from(new Set(urls)).slice(0, limit);
  const resolved = await Promise.all(
    unique.map((u) => urlToDataUrlServer(u, supabase))
  );
  return JSON.stringify(resolved.filter((r): r is string => Boolean(r)));
}

/**
 * Retorna os dados da OS prontos para impressão, com imagens em data URL no servidor.
 * HEIC (iPhone) é convertido para JPEG no navegador pela página de impressão.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Configuração Supabase ausente' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        equipamento,
        marca,
        modelo,
        status,
        created_at,
        prazo_entrega,
        data_entrega,
        vencimento_garantia,
        servico,
        observacao,
        problema_relatado,
        condicoes_equipamento,
        cor,
        numero_serie,
        acessorios,
        atendente,
        senha_acesso,
        senha_aparelho,
        senha_padrao,
        laudo,
        imagens,
        imagens_tecnico,
        checklist_entrada,
        qtd_peca,
        peca,
        valor_peca,
        qtd_servico,
        valor_servico,
        valor_faturado,
        desconto,
        termo_garantia_id,
        empresa_id,
        clientes(nome, telefone, email, cpf, endereco),
        tecnico_id,
        atendente_id,
        empresas(nome, cnpj, endereco, telefone, email, logo_url, link_publico_ativo),
        termo_garantia:termo_garantia_id(id, nome, conteudo)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'OS não encontrada' },
        { status: error?.code === 'PGRST116' ? 404 : 500 }
      );
    }

    let tecnicoNome = 'Sem técnico';
    const tecnicoRef = data.tecnico_id ? String(data.tecnico_id) : '';
    if (tecnicoRef) {
      const { data: tecnicoData } = await supabase
        .from('usuarios')
        .select('nome')
        .or(`id.eq.${tecnicoRef},auth_user_id.eq.${tecnicoRef},tecnico_id.eq.${tecnicoRef}`)
        .limit(1)
        .maybeSingle();
      if (tecnicoData?.nome) tecnicoNome = tecnicoData.nome;
    }

    const ordem: any = {
      ...data,
      relato: data.problema_relatado,
      tecnico: { nome: tecnicoNome },
      laudo: data.laudo ?? null,
    };

    const [imagensPdf, imagensTecnicoPdf] = await Promise.all([
      prepareImagesForPdfServer(data.imagens, supabase, 30),
      prepareImagesForPdfServer((data as any).imagens_tecnico, supabase, 30),
    ]);
    ordem.imagens_pdf = imagensPdf || null;
    ordem.imagens_tecnico_pdf = imagensTecnicoPdf || null;

    // Quando a OS foi entregue, buscar forma de pagamento da venda vinculada
    const statusNormalizado = String(data.status || '').toUpperCase().trim();
    if (statusNormalizado === 'ENTREGUE' && data.empresa_id) {
      const numeroOs = String(data.numero_os ?? data.id ?? '').trim();
      const valorFaturado = Number(data.valor_faturado ?? 0);
      const clienteId = data.cliente_id;
      let lista: any[] = [];
      if (clienteId) {
        const { data: vendasCliente } = await supabase
          .from('vendas')
          .select('forma_pagamento, total, observacoes, cliente_id')
          .eq('empresa_id', data.empresa_id)
          .eq('cliente_id', clienteId)
          .order('data_venda', { ascending: false })
          .limit(50);
        lista = vendasCliente || [];
      }
      if (lista.length === 0) {
        const { data: vendasEmpresa } = await supabase
          .from('vendas')
          .select('forma_pagamento, total, observacoes, cliente_id')
          .eq('empresa_id', data.empresa_id)
          .order('data_venda', { ascending: false })
          .limit(100);
        lista = vendasEmpresa || [];
      }
      const vendaOS = lista.find((v: any) => {
        const obs = String(v.observacoes || '');
        const matchOS = numeroOs && (obs.includes(`O.S. #${numeroOs}`) || obs.includes(`OS #${numeroOs}`) || obs.includes(`#${numeroOs}`));
        const totalVenda = Number(v.total ?? 0);
        const matchValor = valorFaturado > 0 && Math.abs(totalVenda - valorFaturado) <= 1;
        return matchOS || matchValor;
      });
      if (vendaOS?.forma_pagamento) {
        ordem.forma_pagamento = String(vendaOS.forma_pagamento).trim();
      }
    }

    let checklistItens: any[] = [];
    if (data.empresa_id && data.equipamento) {
      const { data: checklistData } = await supabase
        .from('checklist_itens')
        .select('id, nome, categoria')
        .eq('empresa_id', data.empresa_id)
        .eq('equipamento_categoria', data.equipamento)
        .eq('ativo', true)
        .order('ordem');
      checklistItens = checklistData || [];
    }

    return NextResponse.json({ ordem, checklistItens });
  } catch (err) {
    console.error('[dados-impressao] Erro:', err);
    return NextResponse.json(
      { error: 'Erro ao carregar dados para impressão' },
      { status: 500 }
    );
  }
}
