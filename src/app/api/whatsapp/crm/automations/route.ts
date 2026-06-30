import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { seedAutomacoesPadrao } from '@/lib/whatsapp-crm/conversations';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { empresaId };
}

export async function GET(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createAdminClient();
    await seedAutomacoesPadrao(supabase, auth.empresaId);

    const { data, error } = await supabase
      .from('whatsapp_automacoes')
      .select('*')
      .eq('empresa_id', auth.empresaId)
      .order('ordem');

    if (error) throw error;
    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('whatsapp_automacoes')
      .insert({
        empresa_id: auth.empresaId,
        nome: body.nome,
        evento: body.evento,
        status_trigger: body.status_trigger ?? null,
        mensagem_template: body.mensagem_template,
        usar_template_meta: body.usar_template_meta ?? false,
        meta_template_name: body.meta_template_name ?? null,
        ativo: body.ativo ?? true,
        ordem: body.ordem ?? 99,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { id, ...fields } = body;

    const { data, error } = await supabase
      .from('whatsapp_automacoes')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', auth.empresaId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('whatsapp_automacoes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', auth.empresaId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
