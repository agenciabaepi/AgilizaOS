import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Buscar dados do usuário atual usando o token de autorização
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Token de autorização não fornecido' }, { status: 401 });
    }

    // Extrair o token do header Authorization
    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar dados do usuário atual (tentar por auth_user_id primeiro)
    let usuarioAtual: any = null;
    let userError: any = null;
    
    // Tentar buscar por auth_user_id
    const { data: usuarioPorAuth, error: errorAuth } = await supabaseAdmin
      .from('usuarios')
      .select('id, empresa_id, nivel, auth_user_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!errorAuth && usuarioPorAuth) {
      usuarioAtual = usuarioPorAuth;
    } else {
      // Se não encontrou por auth_user_id, tentar buscar pelo id (pode ser que auth_user_id seja null)
      const { data: usuarioPorId, error: errorId } = await supabaseAdmin
        .from('usuarios')
        .select('id, empresa_id, nivel, auth_user_id')
        .eq('id', user.id)
        .single();
      
      if (!errorId && usuarioPorId) {
        usuarioAtual = usuarioPorId;
      } else {
        userError = errorId || errorAuth;
      }
    }

    if (userError || !usuarioAtual) {
      return NextResponse.json({ error: 'Usuário não encontrado na base de dados' }, { status: 404 });
    }

    // Pegar o ID do usuário a ser excluído do body
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }
    
    // Verificar se não está tentando excluir a si mesmo (comparar IDs da tabela usuarios, não auth_user_id)
    if (id === usuarioAtual.id) {
      return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 400 });
    }

    // Buscar dados do usuário a ser excluído
    const { data: usuarioParaExcluir, error: fetchError } = await supabaseAdmin
      .from('usuarios')
      .select('auth_user_id, empresa_id, nivel')
      .eq('id', id)
      .single();

    if (fetchError || !usuarioParaExcluir) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário pertence à mesma empresa
    if (usuarioParaExcluir.empresa_id !== usuarioAtual.empresa_id) {
      return NextResponse.json({ error: 'Usuário não pertence à mesma empresa' }, { status: 403 });
    }

    // Verificar permissões (apenas admin pode excluir)
    // Normalizar nível para comparação (case-insensitive e sem espaços)
    const nivelNormalizado = usuarioAtual.nivel ? String(usuarioAtual.nivel).toLowerCase().trim().replace(/\s+/g, '') : '';
    const nivelLimpo = nivelNormalizado.replace(/[^a-z0-9]/g, '');
    
    // Aceitar variações: 'admin', 'Admin', 'ADMIN', 'admin ', ' admin', etc
    const isAdmin = nivelNormalizado === 'admin' || nivelLimpo === 'admin' || nivelNormalizado.includes('admin');
    
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Apenas administradores podem excluir usuários'
      }, { status: 403 });
    }

    // Excluir o usuário da tabela usuarios
    const { error: deleteError, data: deletedData } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      // Verificar se é erro de foreign key constraint (dados vinculados)
      const isForeignKeyError = deleteError.code === '23503' || 
                                 deleteError.message?.includes('foreign key constraint') ||
                                 deleteError.message?.includes('violates foreign key');
      
      if (isForeignKeyError) {
        // Identificar qual tabela está referenciando
        let tabelaReferencia = 'outros dados';
        if (deleteError.message?.includes('ordens_servico')) {
          tabelaReferencia = 'ordens de serviço';
        } else if (deleteError.message?.includes('comissoes')) {
          tabelaReferencia = 'comissões';
        } else if (deleteError.message?.includes('clientes')) {
          tabelaReferencia = 'clientes';
        }
        
        return NextResponse.json({ 
          error: `Não é possível excluir este usuário porque existem ${tabelaReferencia} vinculadas a ele. Remova ou reatribua os registros relacionados antes de excluir.`,
          code: 'FOREIGN_KEY_CONSTRAINT'
        }, { status: 409 }); // 409 Conflict é mais apropriado para este caso
      }
      
      console.error('Erro ao excluir usuário da tabela:', {
        code: deleteError.code,
        message: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint
      });
      return NextResponse.json({ 
        error: deleteError.message || deleteError.details || 'Erro ao excluir usuário da base de dados'
      }, { status: 500 });
    }

    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum usuário foi excluído. Verifique se o ID está correto.'
      }, { status: 404 });
    }

    // Excluir o usuário do Supabase Auth
    if (usuarioParaExcluir.auth_user_id) {
      try {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          usuarioParaExcluir.auth_user_id
        );
        
        if (authError) {
          console.warn('Erro ao excluir usuário do Auth (pode ser por falta de service role key):', authError);
          // Não falha a operação se não conseguir excluir do Auth
        } else {
          }
      } catch (error) {
        console.warn('Erro ao tentar excluir do Auth (pode ser por falta de service role key):', error);
        // Não falha a operação se não conseguir excluir do Auth
      }
    }

    return NextResponse.json({ message: 'Usuário excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
} 