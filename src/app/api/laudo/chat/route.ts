import { NextRequest, NextResponse } from 'next/server';
import { chatLaudoTecnico, isChatGPTAvailable, type LaudoChatMessage } from '@/lib/chatgpt';
import { assertTemRecurso } from '@/lib/billing/assertPlanResource';

export const runtime = 'nodejs';

/**
 * POST /api/laudo/chat
 * Conversa com IA para redigir/corrigir laudo técnico (estilo ChatGPT).
 */
export async function POST(req: NextRequest) {
  try {
    const access = await assertTemRecurso(req, 'ia');
    if (!access.ok) return access.response;

    const body = await req.json();
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages: LaudoChatMessage[] = rawMessages
      .filter(
        (m: unknown) =>
          m &&
          typeof m === 'object' &&
          ((m as LaudoChatMessage).role === 'user' ||
            (m as LaudoChatMessage).role === 'assistant') &&
          typeof (m as LaudoChatMessage).content === 'string'
      )
      .map((m: LaudoChatMessage & { images?: unknown; panicfull?: unknown }) => {
        const panicRaw = m.panicfull;
        const panicfull =
          panicRaw &&
          typeof panicRaw === 'object' &&
          typeof (panicRaw as { fileName?: string }).fileName === 'string' &&
          typeof (panicRaw as { content?: string }).content === 'string' &&
          (panicRaw as { content: string }).content.trim().length > 0
            ? {
                fileName: (panicRaw as { fileName: string }).fileName.trim().slice(0, 200),
                content: (panicRaw as { content: string }).content.trim().slice(0, 120_000),
              }
            : undefined;

        return {
          role: m.role,
          content: m.content.trim(),
          images: Array.isArray(m.images)
            ? m.images.filter((img): img is string => typeof img === 'string' && img.length > 0).slice(0, 2)
            : undefined,
          panicfull,
        };
      })
      .filter(
        (m) => m.content.length > 0 || (m.images?.length ?? 0) > 0 || Boolean(m.panicfull?.content)
      );

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Envie pelo menos uma mensagem.' },
        { status: 400 }
      );
    }

    if (!isChatGPTAvailable()) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Assistente de IA não está disponível. Configure OPENAI_API_KEY nas variáveis de ambiente.',
        },
        { status: 503 }
      );
    }

    const laudoAtual = typeof body.laudoAtual === 'string' ? body.laudoAtual : undefined;
    const numeroOS = typeof body.numeroOS === 'string' ? body.numeroOS : undefined;
    const nomeTecnico =
      typeof body.nomeTecnico === 'string' ? body.nomeTecnico.trim().slice(0, 80) : undefined;
    const solicitarLaudo = body.solicitarLaudo === true;

    const reply = await chatLaudoTecnico(messages, { laudoAtual, numeroOS, nomeTecnico, solicitarLaudo });

    if (!reply || (!reply.message && !reply.laudo && !(reply.pecas?.length))) {
      return NextResponse.json(
        { success: false, message: 'Não foi possível obter resposta da IA. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: reply.message,
      laudo: reply.laudo,
      pecas: reply.pecas ?? [],
    });
  } catch (err) {
    console.error('Erro em /api/laudo/chat:', err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : 'Erro ao conversar com a IA. Tente novamente.',
      },
      { status: 500 }
    );
  }
}
