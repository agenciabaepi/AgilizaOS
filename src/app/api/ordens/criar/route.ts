import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('API route /api/ordens/criar chamada');
  try {
    const supabase = createServerSupabaseClient();
    console.log('Cliente Supabase criado com sucesso');
    const dadosOS = await request.json();
    console.log('Dados recebidos:', dadosOS);

    // Criar a OS no banco de dados
    const { data: osData, error: osError } = await supabase
      .from('ordens_servico')
      .insert([dadosOS])
      .select()
      .single();

    if (osError) {
      console.error('Erro ao salvar OS:', osError);
      return NextResponse.json(
        { error: 'Erro ao criar a Ordem de Serviço: ' + osError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: osData });

  } catch (error) {
    console.error('Erro geral ao criar OS:', error);
    console.error('Detalhes do erro:', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      dadosOS: dadosOS
    });
    return NextResponse.json(
      { error: 'Erro inesperado ao criar a Ordem de Serviço: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 