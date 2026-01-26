import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { generateOSPDF } from '@/lib/pdfOS';

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

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        created_at,
        marca,
        modelo,
        problema_relatado,
        status,
        servico,
        observacao,
        laudo,
        clientes(nome, telefone, email)
      `)
      .eq('id', osId)
      .single();

    if (error || !data) {
      console.error('Erro ao buscar OS para PDF:', error);
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    const cliente = (data as any).clientes ?? (data as any).cliente ?? null;
    const osData = {
      ...data,
      clientes: cliente,
      observacoes: data.observacao ?? '',
      orcamento: (data as any).orcamento ?? '',
    };

    const pdfBuffer = await generateOSPDF(osData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OS-${data.numero_os || data.id}.pdf"`,
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
