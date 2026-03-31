import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function PATCH(request: NextRequest) {
  try {
    // Criar cliente Supabase exatamente como na API de ordens que funciona
    const cookieStore = await cookies();
    
    // Debug: verificar cookies disponíveis
    const allCookies = cookieStore.getAll();
    console.log('🔍 Debug API - Cookies disponíveis:', allCookies.map(c => c.name));
    console.log('🔍 Debug API - Cookie header:', request.headers.get('cookie'));
    
    // Tentar obter token do header Authorization como fallback
    const authHeader = request.headers.get('authorization');
    const tokenFromHeader = authHeader?.replace('Bearer ', '');
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { 
            const value = cookieStore.get(name)?.value;
            console.log(`🔍 Debug API - Cookie ${name}:`, value ? 'presente' : 'ausente');
            return value;
          },
          set() {},
          remove() {},
        },
        global: {
          headers: {
            Authorization: authHeader || '',
          },
        },
      }
    );

    // Verificar autenticação usando getUser() - mesmo padrão da API de ordens
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ API Route - Erro ao verificar usuário:', userError);
      console.error('❌ API Route - Cookies recebidos:', allCookies.map(c => `${c.name}=${c.value?.substring(0, 20)}...`));
      return NextResponse.json({ error: 'Não autorizado - Usuário não encontrado. Faça login novamente.' }, { status: 401 });
    }
    
    console.log('✅ API Route - Usuário autenticado:', user.id);

    // Ler body após verificar autenticação
    const body = await request.json();
    const { comissaoId, valorComissao, ativa, observacoes } = body;

    if (!comissaoId) {
      return NextResponse.json({ error: 'ID da comissão é obrigatório' }, { status: 400 });
    }

    // Buscar dados do usuário para verificar se é admin
    let usuarioData: any = null;
    
    // Tentar buscar por auth_user_id primeiro
    const { data: usuarioDataByAuth, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, nivel, empresa_id, auth_user_id')
      .eq('auth_user_id', user.id)
      .single();

    if (usuarioError || !usuarioDataByAuth) {
      console.error('Erro ao buscar usuário por auth_user_id:', usuarioError);
      
      // Tentar buscar por email como fallback
      if (user.email) {
        const { data: usuarioDataByEmail, error: emailError } = await supabase
          .from('usuarios')
          .select('id, nivel, empresa_id, auth_user_id, email')
          .eq('email', user.email)
          .single();
        
        if (emailError || !usuarioDataByEmail) {
          console.error('Erro ao buscar usuário por email:', emailError);
          return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
        }
        
        usuarioData = usuarioDataByEmail;
      } else {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
    } else {
      usuarioData = usuarioDataByAuth;
    }
    
    if (!usuarioData) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se é admin ou usuarioteste
    if (usuarioData.nivel !== 'admin' && usuarioData.nivel !== 'usuarioteste') {
      return NextResponse.json({ error: 'Apenas administradores podem editar comissões' }, { status: 403 });
    }

    // Buscar comissão para verificar se pertence à mesma empresa
    const { data: comissaoData, error: comissaoError } = await supabase
      .from('comissoes_historico')
      .select('id, empresa_id')
      .eq('id', comissaoId)
      .single();

    if (comissaoError || !comissaoData) {
      return NextResponse.json({ error: 'Comissão não encontrada' }, { status: 404 });
    }

    if (comissaoData.empresa_id !== usuarioData.empresa_id) {
      return NextResponse.json({ error: 'Comissão não pertence à sua empresa' }, { status: 403 });
    }

    // Preparar dados para atualização
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (valorComissao !== undefined && valorComissao !== null) {
      if (typeof valorComissao !== 'number' || valorComissao < 0) {
        return NextResponse.json({ error: 'Valor da comissão inválido' }, { status: 400 });
      }
      updateData.valor_comissao = valorComissao;
    }

    // Verificar se o campo ativa existe antes de tentar atualizar
    if (ativa !== undefined) {
      // Tentar atualizar o campo ativa (pode não existir ainda)
      // Se der erro, será tratado abaixo
      updateData.ativa = ativa;
    }

    if (observacoes !== undefined) {
      updateData.observacoes = observacoes || null;
    }

    // Log dos dados que serão atualizados
    console.log('🔍 Debug API - Dados para atualização:', {
      comissaoId,
      updateData,
      empresa_id: usuarioData.empresa_id
    });

    // Usar service role diretamente para garantir que a atualização aconteça (bypass RLS)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Atualizar comissão usando service role
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('comissoes_historico')
      .update(updateData)
      .eq('id', comissaoId)
      .eq('empresa_id', usuarioData.empresa_id)
      .select('id, ativa, valor_comissao, observacoes');

    if (updateError) {
      console.error('❌ Erro ao atualizar comissão:', updateError);
      
      // Se o erro for por coluna não existir (ativa), informar que precisa executar o SQL
      if (updateError.message?.includes('column') && updateError.message?.includes('ativa')) {
        return NextResponse.json({ 
          error: 'Campo "ativa" não existe na tabela. Execute o SQL: database/adicionar-campo-ativa-comissoes.sql' 
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: 'Erro ao atualizar comissão: ' + updateError.message }, { status: 500 });
    }

    console.log('✅ Comissão atualizada com sucesso:', updateResult);

    return NextResponse.json({
      success: true,
      message: 'Comissão atualizada com sucesso',
      data: updateResult?.[0] || null,
    });

  } catch (error) {
    console.error('Erro inesperado ao atualizar comissão:', error);
    return NextResponse.json(
      { error: 'Erro inesperado ao atualizar comissão' },
      { status: 500 }
    );
  }
}

