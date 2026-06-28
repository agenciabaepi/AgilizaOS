import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import {
  getEmpresaConfig,
  upsertEmpresaConfig,
  seedAutomacoesPadrao,
} from '@/lib/whatsapp-crm/conversations';
import { validateWhatsAppCredentials } from '@/lib/whatsapp-crm/graph-api';

async function resolveEmpresa(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) return null;
  const empresaId = await getEmpresaIdForUser(userId);
  if (!empresaId) return null;
  return { userId, empresaId };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const supabase = createAdminClient();
    const config = await getEmpresaConfig(supabase, auth.empresaId);

    const safeConfig = config
      ? {
          ...config,
          access_token: config.access_token ? '••••••••' : null,
        }
      : null;

    return NextResponse.json({ success: true, data: safeConfig });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveEmpresa(req);
    if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { phone_number_id, access_token, business_account_id, ativo } = body;

    if (!phone_number_id) {
      return NextResponse.json({ error: 'Phone Number ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const existing = await getEmpresaConfig(supabase, auth.empresaId);
    const tokenToUse =
      access_token && access_token !== '••••••••'
        ? access_token
        : existing?.access_token;

    if (!tokenToUse) {
      return NextResponse.json({ error: 'Access Token é obrigatório' }, { status: 400 });
    }

    const validation = await validateWhatsAppCredentials(phone_number_id, tokenToUse);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Credenciais inválidas' },
        { status: 400 }
      );
    }

    const config = await upsertEmpresaConfig(supabase, auth.empresaId, {
      phone_number_id,
      access_token: tokenToUse,
      business_account_id: business_account_id ?? null,
      display_phone_number: validation.displayPhone ?? null,
      ativo: ativo ?? true,
      webhook_verified: false,
    });

    await seedAutomacoesPadrao(supabase, auth.empresaId);

    return NextResponse.json({
      success: true,
      data: { ...config, access_token: '••••••••' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
