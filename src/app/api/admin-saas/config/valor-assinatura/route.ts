import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

const CHAVE_VALOR_ASSINATURA = 'valor_assinatura_mensal';

const HINT_CRIAR_TABELA =
  'No Supabase: Dashboard → SQL Editor → cole e execute o arquivo database/config_sistema_valor_assinatura.sql deste repositório (cria public.config_sistema e a linha padrão).';

/** Objeto vazio `{}` às vezes vem no update PostgREST; não é sucesso, só seguimos para select/insert obter o erro real. */
function coerceDbError(err: unknown): { error: string; code?: string } | null {
  if (err == null) return null;
  if (typeof err === 'string') {
    const t = err.trim();
    return t ? { error: t } : null;
  }
  if (typeof err !== 'object') {
    return { error: String(err) };
  }
  const o = err as Record<string, unknown>;
  if (Object.keys(o).length === 0) {
    return null;
  }
  const msg = [o.message, o.details, o.hint]
    .map((x) => (x != null && x !== '' ? String(x).trim() : ''))
    .filter(Boolean)
    .join(' — ');
  const code = o.code != null && o.code !== '' ? String(o.code) : '';
  if (msg) {
    return code ? { error: `${msg} (${code})`, code } : { error: msg };
  }
  if (code) {
    return { error: `Erro no banco (código ${code}). Verifique se a tabela config_sistema existe e está exposta na API.`, code };
  }
  let raw = '';
  try {
    raw = JSON.stringify(o);
  } catch {
    raw = String(err);
  }
  if (process.env.NODE_ENV === 'development') {
    console.error('[valor-assinatura] erro bruto do PostgREST:', o);
  }
  return { error: raw.length > 400 ? `${raw.slice(0, 400)}…` : raw || 'Erro no banco' };
}

function withMissingTableHint(payload: { error: string; code?: string }): {
  error: string;
  code?: string;
  hint?: string;
} {
  const blob = `${payload.error} ${payload.code ?? ''}`;
  if (/42P01|does not exist|config_sistema/i.test(blob)) {
    return { ...payload, hint: HINT_CRIAR_TABELA };
  }
  return payload;
}

function parseValorMonetarioInput(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const normalized = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * GET /api/admin-saas/config/valor-assinatura
 * Retorna o valor atual da assinatura (admin)
 */
export async function GET(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('config_sistema')
      .select('valor')
      .eq('chave', CHAVE_VALOR_ASSINATURA)
      .maybeSingle();

    const getErr = coerceDbError(error);
    if (getErr) {
      return NextResponse.json({ ok: false, ...withMissingTableHint(getErr) }, { status: 500 });
    }

    const valor = data?.valor != null ? parseFloat(String(data.valor)) : 119.9;
    const valorFinal = Number.isFinite(valor) && valor > 0 ? valor : 119.9;

    return NextResponse.json({ ok: true, valor: valorFinal });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: msg || 'Erro inesperado' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin-saas/config/valor-assinatura
 * Atualiza o valor da assinatura (admin)
 * Body: { valor: number }
 */
export async function PATCH(req: NextRequest) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const valor = parseValorMonetarioInput(body.valor);

    if (valor == null) {
      return NextResponse.json(
        { ok: false, error: 'Valor inválido. Informe um número positivo (ex: 119.90)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const valorStr = String(valor);

    const { error: updateError } = await supabase
      .from('config_sistema')
      .update({ valor: valorStr })
      .eq('chave', CHAVE_VALOR_ASSINATURA);

    const updErr = coerceDbError(updateError);
    if (updErr) {
      return NextResponse.json({ ok: false, ...withMissingTableHint(updErr) }, { status: 500 });
    }

    const { data: row, error: readError } = await supabase
      .from('config_sistema')
      .select('valor')
      .eq('chave', CHAVE_VALOR_ASSINATURA)
      .maybeSingle();

    const rdErr = coerceDbError(readError);
    if (rdErr) {
      return NextResponse.json({ ok: false, ...withMissingTableHint(rdErr) }, { status: 500 });
    }

    const persisted = row?.valor != null ? parseFloat(String(row.valor)) : NaN;
    if (Number.isFinite(persisted) && Math.abs(persisted - valor) < 0.005) {
      return NextResponse.json({ ok: true, valor });
    }

    const { error: insertError } = await supabase.from('config_sistema').insert({
      chave: CHAVE_VALOR_ASSINATURA,
      valor: valorStr,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        const { error: retryErr } = await supabase
          .from('config_sistema')
          .update({ valor: valorStr })
          .eq('chave', CHAVE_VALOR_ASSINATURA);
        const rErr = coerceDbError(retryErr);
        if (rErr) {
          return NextResponse.json({ ok: false, ...withMissingTableHint(rErr) }, { status: 500 });
        }
        return NextResponse.json({ ok: true, valor });
      }
      const insErr = coerceDbError(insertError);
      if (insErr) {
        return NextResponse.json({ ok: false, ...withMissingTableHint(insErr) }, { status: 500 });
      }
      return NextResponse.json(
        {
          ok: false,
          error:
            'Não foi possível gravar em config_sistema (insert falhou sem mensagem do banco). Confira se a tabela existe.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, valor });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro inesperado';
    return NextResponse.json({ ok: false, error: msg || 'Erro inesperado' }, { status: 500 });
  }
}
