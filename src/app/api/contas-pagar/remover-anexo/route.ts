import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contaId = searchParams.get('contaId');
    const urlAnexo = searchParams.get('url');

    if (!contaId || !urlAnexo) {
      return NextResponse.json({ 
        error: 'ID da conta e URL do anexo são obrigatórios' 
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar anexos existentes da conta
    const { data: contaData, error: contaError } = await supabase
      .from('contas_pagar')
      .select('anexos_url')
      .eq('id', contaId)
      .single();

    if (contaError) {
      console.error('Erro ao buscar conta:', contaError);
      return NextResponse.json({ 
        error: 'Erro ao buscar dados da conta' 
      }, { status: 500 });
    }

    const anexosExistentes = contaData.anexos_url || [];
    
    // Remover a URL do array
    const anexosAtualizados = anexosExistentes.filter((url: string) => url !== urlAnexo);

    // Extrair nome do arquivo da URL para remover do storage
    const fileName = urlAnexo.split('/').pop();
    
    if (fileName) {
      // Remover arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('anexos-contas')
        .remove([fileName]);

      if (storageError) {
        console.warn('Erro ao remover arquivo do storage:', storageError);
        // Continuar mesmo com erro no storage
      }
    }

    // Atualizar a conta com os anexos atualizados
    const { error: updateError } = await supabase
      .from('contas_pagar')
      .update({ anexos_url: anexosAtualizados })
      .eq('id', contaId);

    if (updateError) {
      console.error('Erro ao atualizar conta:', updateError);
      return NextResponse.json({ 
        error: 'Erro ao atualizar conta' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      anexos: anexosAtualizados
    });

  } catch (error) {
    console.error('Erro na API remover anexo:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
