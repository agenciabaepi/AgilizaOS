import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    
    // Buscar dados do usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar empresa_id do usuário
    const { data: userData } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData?.empresa_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });
    }

    // Preparar dados para atualização
    const updateData: any = {};

    // Dados básicos
    const servico = formData.get('servico') as string;
    const peca = formData.get('peca') as string;
    const qtd_servico = parseInt(formData.get('qtd_servico') as string) || 0;
    const qtd_peca = parseInt(formData.get('qtd_peca') as string) || 0;
    const valor_servico = parseFloat(formData.get('valor_servico') as string) || 0;
    const valor_peca = parseFloat(formData.get('valor_peca') as string) || 0;
    const status_id = formData.get('status_id') as string;
    const tecnico_id = formData.get('tecnico_id') as string;
    const termo_garantia_id = formData.get('termo_garantia_id') as string;

    // Adicionar dados se não estiverem vazios
    if (servico) updateData.servico = servico;
    if (peca) updateData.peca = peca;
    if (qtd_servico > 0) updateData.qtd_servico = qtd_servico;
    if (qtd_peca > 0) updateData.qtd_peca = qtd_peca;
    if (valor_servico > 0) updateData.valor_servico = valor_servico;
    if (valor_peca > 0) updateData.valor_peca = valor_peca;
    if (status_id) updateData.status_id = status_id;
    if (tecnico_id) updateData.tecnico_id = tecnico_id;
    if (termo_garantia_id) updateData.termo_garantia_id = termo_garantia_id;

    // Calcular valor total
    const valor_faturado = (qtd_servico * valor_servico) + (qtd_peca * valor_peca);
    updateData.valor_faturado = valor_faturado;

    // Atualizar a ordem de serviço
    const { data, error } = await supabase
      .from('ordens_servico')
      .update(updateData)
      .eq('id', params.id)
      .eq('empresa_id', userData.empresa_id)
      .select();

    if (error) {
      console.error('Erro ao atualizar ordem:', error);
      return NextResponse.json({ error: 'Erro ao atualizar ordem' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erro na API de editar ordem:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 