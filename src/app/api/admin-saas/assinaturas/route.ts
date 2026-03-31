import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const status = url.searchParams.get('status') || '';
    const search = (url.searchParams.get('search') || '').trim();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('assinaturas')
      .select('id, empresa_id, plano_id, status, data_inicio, data_fim, data_trial_fim, proxima_cobranca, valor, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (search) {
      // Buscar por empresa ou ID de assinatura
      query = query.or(`id.ilike.%${search}%`);
    }

    const { data: rows, error, count } = await query;
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

    // Buscar empresas e planos relacionados
    const empresaIds = Array.from(new Set((rows || []).map((r: any) => r.empresa_id).filter(Boolean)));
    const planoIds = Array.from(new Set((rows || []).map((r: any) => r.plano_id).filter(Boolean)));

    const empresaMap: Record<string, any> = {};
    const planoMap: Record<string, any> = {};

    if (empresaIds.length) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome, email, cnpj')
        .in('id', empresaIds);
      for (const e of empresas || []) empresaMap[e.id] = e;
    }

    if (planoIds.length) {
      const { data: planos } = await supabase
        .from('planos')
        .select('id, nome, descricao, preco')
        .in('id', planoIds);
      for (const p of planos || []) planoMap[p.id] = p;
    }

    const items = (rows || []).map((r: any) => {
      const empresa = empresaMap[r.empresa_id];
      const plano = planoMap[r.plano_id];

      // Verificar se está vencido
      let vencido = false;
      if (r.status === 'active' && r.proxima_cobranca) {
        const proxCobranca = new Date(r.proxima_cobranca);
        vencido = proxCobranca < new Date();
      } else if (r.status === 'trial' && r.data_trial_fim) {
        const trialFim = new Date(r.data_trial_fim);
        vencido = trialFim < new Date();
      }

      return {
        ...r,
        empresa: empresa ? {
          id: empresa.id,
          nome: empresa.nome,
          email: empresa.email || null,
          cnpj: empresa.cnpj || null,
        } : null,
        plano: plano ? {
          id: plano.id,
          nome: plano.nome,
          descricao: plano.descricao || null,
          preco: plano.preco || null,
        } : null,
        vencido,
      };
    });

    // Se houver busca por empresa, filtrar aqui
    if (search) {
      const searchLower = search.toLowerCase();
      const filtered = items.filter((item: any) => 
        item.empresa?.nome?.toLowerCase().includes(searchLower) ||
        item.empresa?.email?.toLowerCase().includes(searchLower) ||
        item.empresa?.cnpj?.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower)
      );
      
      return NextResponse.json({
        ok: true,
        items: filtered,
        page,
        pageSize,
        total: filtered.length,
      });
    }

    return NextResponse.json({ ok: true, items, page, pageSize, total: count || 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}

