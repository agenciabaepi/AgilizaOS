import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();

    const [empresasCount, usuariosCount, assinaturasCount, pagamentosCount] = await Promise.all([
      supabase.from('empresas').select('id', { count: 'exact', head: true }),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }),
      supabase.from('assinaturas').select('id,status', { count: 'exact', head: true }),
      supabase.from('pagamentos').select('id,status', { count: 'exact', head: true }),
    ]);

    const assinaturasPorStatus = await supabase
      .from('assinaturas')
      .select('status', { count: 'exact' })
      .then(r => {
        if (r.error || !r.data) return {} as Record<string, number>;
        const map: Record<string, number> = {};
        for (const row of r.data as any[]) {
          const s = String(row.status || 'desconhecido');
          map[s] = (map[s] || 0) + 1;
        }
        return map;
      });

    const pagamentosPorStatus = await supabase
      .from('pagamentos')
      .select('status', { count: 'exact' })
      .then(r => {
        if (r.error || !r.data) return {} as Record<string, number>;
        const map: Record<string, number> = {};
        for (const row of r.data as any[]) {
          const s = String(row.status || 'desconhecido');
          map[s] = (map[s] || 0) + 1;
        }
        return map;
      });

    return NextResponse.json({
      ok: true,
      empresas: empresasCount.count || 0,
      usuarios: usuariosCount.count || 0,
      assinaturas: assinaturasCount.count || 0,
      pagamentos: pagamentosCount.count || 0,
      assinaturasPorStatus,
      pagamentosPorStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}

 
