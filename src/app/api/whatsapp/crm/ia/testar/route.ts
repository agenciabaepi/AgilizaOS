import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaIdForUser, getSessionUserId } from '@/lib/api/routeAuthEmpresa';
import { createAdminClient } from '@/lib/supabaseClient';
import { assertWhatsAppCrmAccess } from '@/lib/whatsapp-crm/guard';
import {
  consultarOsCitadas,
  gerarRespostaIA,
  getEmpresaBasica,
  iaDisponivel,
  sanitizarIaConfig,
  type MensagemHistoricoIA,
} from '@/lib/whatsapp-crm/assistente-ia';

/** Simula uma conversa com o rascunho do treinamento, sem salvar nem enviar nada ao WhatsApp. */
export async function POST(req: NextRequest) {
  try {
    const blocked = await assertWhatsAppCrmAccess(req);
    if (blocked) return blocked;

    const userId = await getSessionUserId(req);
    const empresaId = userId ? await getEmpresaIdForUser(userId) : null;
    if (!empresaId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    if (!iaDisponivel()) {
      return NextResponse.json({ error: 'OPENAI_API_KEY não configurada no servidor' }, { status: 503 });
    }

    const body = (await req.json()) as { config?: Record<string, unknown>; historico?: unknown[] };
    const historico: MensagemHistoricoIA[] = (Array.isArray(body.historico) ? body.historico : [])
      .map((m) => m as Partial<MensagemHistoricoIA>)
      .filter((m) => (m.direcao === 'entrada' || m.direcao === 'saida') && typeof m.conteudo === 'string')
      .slice(-20)
      .map((m) => ({ direcao: m.direcao!, conteudo: m.conteudo!.slice(0, 1000) }));

    if (!historico.length || historico[historico.length - 1].direcao !== 'entrada') {
      return NextResponse.json({ error: 'Envie uma mensagem de cliente para testar' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const [empresa, consultas] = await Promise.all([
      getEmpresaBasica(supabase, empresaId),
      consultarOsCitadas(supabase, empresaId, historico, null),
    ]);
    const resultado = await gerarRespostaIA({
      config: sanitizarIaConfig(body.config ?? {}),
      empresa,
      consultas,
      historico,
    });

    if (!resultado) {
      return NextResponse.json({ error: 'A IA não retornou resposta' }, { status: 502 });
    }
    return NextResponse.json({ success: true, data: resultado });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
