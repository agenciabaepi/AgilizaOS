import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import { MS_TRIAL_GRATIS } from '@/config/trial';

export async function POST(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });

    const { nome, email, cnpj, telefone, endereco, plano_id } = await req.json();
    if (!nome) return NextResponse.json({ ok: false, message: 'nome é obrigatório' }, { status: 400 });

    const supabase = getSupabaseAdmin();

    const { data: empresa, error: empErr } = await supabase
      .from('empresas')
      .insert({ nome, email, cnpj, telefone, endereco, status: 'pendente', ativo: false })
      .select()
      .single();

    if (empErr) return NextResponse.json({ ok: false, error: empErr }, { status: 500 });

    if (plano_id) {
      const inicio = empresa.created_at
        ? new Date(empresa.created_at as string)
        : new Date();
      await supabase.from('assinaturas').insert({
        empresa_id: empresa.id,
        plano_id,
        status: 'trial',
        data_inicio: inicio.toISOString(),
        data_trial_fim: new Date(inicio.getTime() + MS_TRIAL_GRATIS).toISOString(),
        valor: 0,
      });
    }

    return NextResponse.json({ ok: true, empresa });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Erro inesperado' }, { status: 500 });
  }
}


