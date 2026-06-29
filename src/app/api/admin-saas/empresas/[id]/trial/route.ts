import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';
import {
  dataFimTrialAPartirDe,
  dataFimTrialSomandoDias,
  resolveDiasTrial,
} from '@/config/trial';

type ContarDe = 'criacao' | 'hoje';

function parseDiasTrial(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return resolveDiasTrial(v);
  if (typeof v === 'string' && v.trim()) {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n > 0) return resolveDiasTrial(n);
  }
  return null;
}

function parseDataTrialFim(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * POST /api/admin-saas/empresas/[id]/trial
 * Define prazo de teste da empresa.
 * Body: { dias_trial?: number, data_trial_fim?: string, contar_de?: 'criacao' | 'hoje' }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId } = await params;
    const body = await req.json().catch(() => ({}));

    const diasTrial = parseDiasTrial(body.dias_trial);
    const dataTrialFimInput = parseDataTrialFim(body.data_trial_fim);
    const contarDe: ContarDe = body.contar_de === 'criacao' ? 'criacao' : 'hoje';

    if (!diasTrial && !dataTrialFimInput) {
      return NextResponse.json(
        { ok: false, message: 'Informe dias_trial ou data_trial_fim' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, created_at')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      return NextResponse.json({ ok: false, message: 'Empresa não encontrada' }, { status: 404 });
    }

    const createdAt = empresa.created_at ? String(empresa.created_at) : new Date().toISOString();
    const inicio =
      contarDe === 'criacao' ? createdAt : new Date().toISOString();

    let dataTrialFim: string;
    let diasEfetivos: number;

    if (dataTrialFimInput) {
      dataTrialFim = dataTrialFimInput;
      const inicioMs = new Date(inicio).getTime();
      const fimMs = new Date(dataTrialFim).getTime();
      diasEfetivos = Math.max(1, Math.ceil((fimMs - inicioMs) / (24 * 60 * 60 * 1000)));
    } else {
      diasEfetivos = diasTrial!;
      dataTrialFim =
        contarDe === 'criacao'
          ? dataFimTrialAPartirDe(createdAt, diasEfetivos)!
          : dataFimTrialSomandoDias(new Date(), diasEfetivos);
    }

    const { error: empresaUpdateError } = await supabase
      .from('empresas')
      .update({ dias_trial: diasEfetivos })
      .eq('id', empresaId);

    if (empresaUpdateError) {
      console.error('Erro ao atualizar dias_trial:', empresaUpdateError);
      return NextResponse.json(
        { ok: false, message: empresaUpdateError.message || 'Falha ao salvar prazo' },
        { status: 500 }
      );
    }

    const { data: assinaturaAtual } = await supabase
      .from('assinaturas')
      .select('id, status')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const agora = new Date().toISOString();
    const obs = `Trial definido pelo admin: ${diasEfetivos} dias (${contarDe === 'criacao' ? 'desde criação' : 'a partir de hoje'}). Fim: ${dataTrialFim}`;

    if (assinaturaAtual?.id) {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update({
          status: 'trial',
          data_trial_fim: dataTrialFim,
          data_inicio: contarDe === 'criacao' ? createdAt : agora,
          observacoes: obs,
          updated_at: agora,
        })
        .eq('id', assinaturaAtual.id);

      if (updateError) {
        return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase.from('assinaturas').insert({
        empresa_id: empresaId,
        status: 'trial',
        data_inicio: contarDe === 'criacao' ? createdAt : agora,
        data_trial_fim: dataTrialFim,
        valor: 0,
        observacoes: obs,
      });

      if (insertError) {
        return NextResponse.json({ ok: false, message: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      dias_trial: diasEfetivos,
      data_trial_fim: dataTrialFim,
      contar_de: contarDe,
      message: `Período de teste definido: ${diasEfetivos} dias (até ${new Date(dataTrialFim).toLocaleDateString('pt-BR')})`,
    });
  } catch (err: unknown) {
    console.error('POST empresas/[id]/trial:', err);
    const message = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
