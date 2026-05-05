import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isAdminAuthorized } from '@/lib/admin-auth';

const PATCH_KEYS = [
  'nome',
  'telefone',
  'celular',
  'email',
  'documento',
  'tipo',
  'observacoes',
  'responsavel',
  'senha',
  'cep',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'origem',
  'aniversario',
  'status',
] as const;

type PatchKey = (typeof PATCH_KEYS)[number];

function buildEndereco(row: Record<string, unknown>): string {
  const rua = String(row.rua ?? '').trim();
  const numero = String(row.numero ?? '').trim();
  const bairro = String(row.bairro ?? '').trim();
  const cidade = String(row.cidade ?? '').trim();
  const estado = String(row.estado ?? '').trim();
  return `${rua}, ${numero}, ${bairro}, ${cidade} - ${estado}`;
}

/**
 * GET /api/admin-saas/empresas/[id]/clientes/[clienteId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clienteId: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId, clienteId } = await params;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message || 'Erro ao buscar cliente' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ ok: false, message: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, cliente: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/admin-saas/empresas/[id]/clientes/[clienteId]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; clienteId: string }> }
) {
  try {
    const ok = await isAdminAuthorized(req);
    if (!ok) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    const { id: empresaId, clienteId } = await params;
    const body = (await req.json()) as Record<string, unknown>;

    const supabase = getSupabaseAdmin();

    const { data: current, error: curErr } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (curErr) {
      return NextResponse.json(
        { ok: false, message: curErr.message || 'Erro ao validar cliente' },
        { status: 500 }
      );
    }

    if (!current) {
      return NextResponse.json({ ok: false, message: 'Cliente não encontrado' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};
    for (const key of PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        let v = body[key];
        if (key === 'aniversario' && (v === '' || v === undefined)) {
          v = null;
        }
        if (key === 'status' && typeof v === 'string') {
          const s = v.trim().toLowerCase();
          if (s !== 'ativo' && s !== 'inativo') {
            return NextResponse.json(
              { ok: false, message: 'status deve ser "ativo" ou "inativo"' },
              { status: 400 }
            );
          }
          v = s;
        }
        update[key] = v;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, message: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    if (typeof update.nome === 'string' && !String(update.nome).trim()) {
      return NextResponse.json({ ok: false, message: 'Nome é obrigatório' }, { status: 400 });
    }

    const merged: Record<string, unknown> = { ...current, ...update };

    const addrKeys: PatchKey[] = ['rua', 'numero', 'bairro', 'cidade', 'estado'];
    if (addrKeys.some((k) => k in update)) {
      update.endereco = buildEndereco(merged);
    }

    if ('documento' in update) {
      update.cpf = update.documento;
    }

    const { data: saved, error: upErr } = await supabase
      .from('clientes')
      .update(update)
      .eq('id', clienteId)
      .eq('empresa_id', empresaId)
      .select('*')
      .single();

    if (upErr) {
      return NextResponse.json(
        { ok: false, message: upErr.message || 'Erro ao atualizar cliente' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, cliente: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
