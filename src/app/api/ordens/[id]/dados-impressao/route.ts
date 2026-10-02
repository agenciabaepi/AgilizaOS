import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { carregarDadosImpressao } from '@/lib/ordem-pdf/dados-impressao';

/**
 * Retorna os dados da OS prontos para impressão, com imagens em data URL no servidor.
 * HEIC (iPhone) é convertido para JPEG no navegador pela página de impressão.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Configuração Supabase ausente' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const dados = await carregarDadosImpressao(supabase, id);
    if (!dados) {
      return NextResponse.json({ error: 'OS não encontrada' }, { status: 404 });
    }

    return NextResponse.json(dados);
  } catch (err) {
    console.error('[dados-impressao] Erro:', err);
    return NextResponse.json(
      { error: 'Erro ao carregar dados para impressão' },
      { status: 500 }
    );
  }
}
