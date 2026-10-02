import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { gerarPdfOsBuffer } from '@/lib/whatsapp-crm/os-pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/pdf/gerar-os?osId=xxx
 * Gera o PDF da Ordem de Serviço e retorna o arquivo.
 */
export async function GET(request: NextRequest) {
  try {
    const osId = request.nextUrl.searchParams.get('osId');
    if (!osId) {
      return NextResponse.json({ error: 'osId é obrigatório' }, { status: 400 });
    }

    const pdf = await gerarPdfOsBuffer(createAdminClient(), osId);
    if (!pdf) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdf.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdf.filename}"`,
      },
    });
  } catch (err) {
    console.error('Erro ao gerar PDF da OS:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
