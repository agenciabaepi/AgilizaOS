import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    // Buscar OSs com status APROVADO
    const { data: ordensRecentes, error: ordensError } = await supabase
      .from('ordens_servico')
      .select(`
        id,
        numero_os,
        tecnico_id,
        status,
        clientes!inner(nome, telefone)
      `)
      .eq('status', 'APROVADO')
      .limit(5);

    if (ordensError) {
      return NextResponse.json({ 
        error: 'Erro ao buscar OSs', 
        details: ordensError
      }, { status: 500 });
    }

    // Buscar todos os técnicos
    const { data: todosTecnicos, error: tecnicosError } = await supabase
      .from('usuarios')
      .select('id, nome, whatsapp, nivel')
      .eq('nivel', 'tecnico');

    if (tecnicosError) {
      return NextResponse.json({ 
        error: 'Erro ao buscar técnicos', 
        details: tecnicosError
      }, { status: 500 });
    }

    // Verificar quais técnicos das OSs existem
    const tecnicoIdsDasOSs = ordensRecentes.map(os => os.tecnico_id).filter(Boolean);
    const tecnicoIdsExistentes = todosTecnicos.map(t => t.id);
    
    const tecnicosEncontrados = tecnicoIdsDasOSs.filter(id => tecnicoIdsExistentes.includes(id));
    const tecnicosNaoEncontrados = tecnicoIdsDasOSs.filter(id => !tecnicoIdsExistentes.includes(id));

    return NextResponse.json({
      success: true,
      message: 'Debug de técnicos executado!',
      resumo: {
        totalOSs: ordensRecentes.length,
        totalTecnicos: todosTecnicos.length,
        tecnicosEncontrados: tecnicosEncontrados.length,
        tecnicosNaoEncontrados: tecnicosNaoEncontrados.length
      },
      ordensRecentes: ordensRecentes.map(os => ({
        numero_os: os.numero_os,
        tecnico_id: os.tecnico_id,
        cliente_nome: (os.clientes as any)?.nome,
        tecnicoExiste: tecnicoIdsExistentes.includes(os.tecnico_id)
      })),
      todosTecnicos: todosTecnicos.map(t => ({
        id: t.id,
        nome: t.nome,
        whatsapp: t.whatsapp,
        nivel: t.nivel
      })),
      tecnicosNaoEncontrados: tecnicosNaoEncontrados,
      tecnicoIdsDasOSs: tecnicoIdsDasOSs,
      tecnicoIdsExistentes: tecnicoIdsExistentes
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Erro interno no debug', 
      details: error.message
    }, { status: 500 });
  }
}
