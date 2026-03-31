import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/os-public/[id]/dados
 * Header: X-Senha-OS: <senha>
 * Retorna dados completos da OS para o cliente (após validar senha): cliente, aparelho, imagens, laudo, status, histórico.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const senha = request.headers.get('X-Senha-OS')?.trim() ?? '';

    if (!id || !senha) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 });
    }

    const supabase = createServerClient(url, serviceKey, {
      cookies: { get() { return undefined; }, set() {}, remove() {} },
    });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let os: Record<string, unknown> | null = null;
    let lookupError: { message: string } | null = null;

    if (isUuid) {
      const res = await supabase
        .from('ordens_servico')
        .select(`
          id, numero_os, equipamento, marca, modelo, cor, numero_serie, acessorios, condicoes_equipamento,
          status, status_tecnico, created_at, prazo_entrega, data_entrega,
          problema_relatado, servico, observacao, checklist_entrada, laudo,
          imagens, imagens_tecnico, empresa_id, cliente_id, senha_acesso, termo_garantia_id,
          peca, qtd_peca, valor_peca, qtd_servico, valor_servico, desconto, valor_faturado
        `)
        .eq('id', id)
        .maybeSingle();
      os = res.data as Record<string, unknown> | null;
      lookupError = res.error as { message: string } | null;
    }
    if (!os && !lookupError) {
      const res = await supabase
        .from('ordens_servico')
        .select(`
          id, numero_os, equipamento, marca, modelo, cor, numero_serie, acessorios, condicoes_equipamento,
          status, status_tecnico, created_at, prazo_entrega, data_entrega,
          problema_relatado, servico, observacao, checklist_entrada, laudo,
          imagens, imagens_tecnico, empresa_id, cliente_id, senha_acesso, termo_garantia_id,
          peca, qtd_peca, valor_peca, qtd_servico, valor_servico, desconto, valor_faturado
        `)
        .eq('numero_os', id)
        .maybeSingle();
      os = res.data as Record<string, unknown> | null;
      lookupError = res.error as { message: string } | null;
    }
    if (!os && !lookupError && /^\d+$/.test(id)) {
      const res = await supabase
        .from('ordens_servico')
        .select(`
          id, numero_os, equipamento, marca, modelo, cor, numero_serie, acessorios, condicoes_equipamento,
          status, status_tecnico, created_at, prazo_entrega, data_entrega,
          problema_relatado, servico, observacao, checklist_entrada, laudo,
          imagens, imagens_tecnico, empresa_id, cliente_id, senha_acesso, termo_garantia_id,
          peca, qtd_peca, valor_peca, qtd_servico, valor_servico, desconto, valor_faturado
        `)
        .eq('numero_os', parseInt(id, 10))
        .maybeSingle();
      os = res.data as Record<string, unknown> | null;
      lookupError = res.error as { message: string } | null;
    }

    if (lookupError || !os) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    }

    const senhaOs = os.senha_acesso != null ? String(os.senha_acesso).trim() : '';
    if (!senhaOs || senhaOs.toLowerCase() !== senha.toLowerCase()) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome, link_publico_ativo')
      .eq('id', os.empresa_id)
      .maybeSingle();
    const ativo = (empresa as { link_publico_ativo?: boolean } | null)?.link_publico_ativo ?? true;
    if (!ativo) {
      return NextResponse.json({ error: 'Recurso desativado' }, { status: 403 });
    }

    let cliente: { nome?: string; telefone?: string; email?: string; endereco?: string } | null = null;
    if (os.cliente_id) {
      const { data: c } = await supabase
        .from('clientes')
        .select('nome, telefone, email, endereco')
        .eq('id', os.cliente_id)
        .maybeSingle();
      cliente = c as typeof cliente;
    }

    let historico: { status: string; created_at: string }[] = [];
    const { data: hist } = await supabase
      .from('status_historico')
      .select('status_novo, created_at')
      .eq('os_id', os.id)
      .order('created_at', { ascending: true });
    if (Array.isArray(hist)) {
      historico = hist.map((h: { status_novo?: string; created_at: string }) => ({
        status: (h as any).status_novo ?? '',
        created_at: (h as any).created_at ?? '',
      }));
    }

    let termo_garantia: { nome?: string; conteudo?: string } | null = null;
    const termoId = os.termo_garantia_id as string | null | undefined;
    if (termoId) {
      const { data: termo } = await supabase
        .from('termos_garantia')
        .select('nome, conteudo')
        .eq('id', termoId)
        .maybeSingle();
      termo_garantia = termo as typeof termo_garantia;
    }

    const { senha_acesso: _s, cliente_id: _c, termo_garantia_id: _tg, ...rest } = os;
    return NextResponse.json({
      ...rest,
      empresa_nome: (empresa as { nome?: string } | null)?.nome ?? '',
      status_atual: (os.status as string) ?? '',
      cliente,
      historico,
      termo_garantia,
    });
  } catch (e) {
    console.error('[os-public dados]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
