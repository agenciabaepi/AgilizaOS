import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    const { id, nome, email, usuario, telefone, cpf, whatsapp, nivel, permissoes, senha, auth_user_id } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário não informado' }, { status: 400 });
    }

    // Atualiza e-mail no Supabase Auth se fornecido e se o email mudou
    if (email && auth_user_id) {
      // Buscar o usuário atual para verificar se o email mudou
      const { data: currentUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(auth_user_id);
      
      if (fetchError) {
        console.error('Erro ao buscar usuário atual:', fetchError);
        return NextResponse.json({ error: 'Erro ao verificar usuário atual' }, { status: 400 });
      }
      
      // Só atualizar o email se ele realmente mudou
      if (currentUser?.user?.email !== email) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { email: email });
        if (emailError) {
          console.error('Erro ao atualizar e-mail no Auth:', emailError);
          return NextResponse.json({ error: 'Erro ao atualizar e-mail: ' + emailError.message }, { status: 400 });
        }
      }
    }

    // Atualiza senha no Supabase Auth se fornecida
    if (senha && auth_user_id) {
      const { error: senhaError } = await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password: senha });
      if (senhaError) {
        return NextResponse.json({ error: 'Erro ao atualizar senha: ' + senhaError.message }, { status: 400 });
      }
    }

    // Verifica se já existe outro usuário com esse WhatsApp (normalizado, sem caracteres não numéricos)
    // O WhatsApp deve ser único globalmente, não apenas por empresa, para evitar conflitos no bot
    if (whatsapp && whatsapp.trim()) {
      const whatsappNormalizado = whatsapp.replace(/\D/g, ''); // Remove tudo que não é número
      
      // Buscar todos os usuários com WhatsApp (exceto o atual) e verificar se algum tem o mesmo número normalizado
      const { data: usuariosComWhatsApp, error: whatsappError } = await supabaseAdmin
        .from('usuarios')
        .select('id, whatsapp')
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '')
        .neq('id', id); // Excluir o usuário atual da verificação

      if (whatsappError) {
        console.error('Erro ao verificar WhatsApp:', whatsappError);
        return NextResponse.json({ error: 'Erro ao verificar WhatsApp.' }, { status: 500 });
      }

      // Verificar se algum usuário tem o mesmo número normalizado
      const whatsappJaExiste = usuariosComWhatsApp?.some(u => {
        if (!u.whatsapp) return false;
        const dbWhatsappNormalizado = u.whatsapp.replace(/\D/g, '');
        // Comparar números normalizados (com e sem código do país)
        return dbWhatsappNormalizado === whatsappNormalizado ||
               dbWhatsappNormalizado === whatsappNormalizado.replace(/^55/, '') ||
               `55${dbWhatsappNormalizado}` === whatsappNormalizado ||
               dbWhatsappNormalizado.replace(/^55/, '') === whatsappNormalizado.replace(/^55/, '');
      });

      if (whatsappJaExiste) {
        console.error('WhatsApp já cadastrado:', whatsappNormalizado);
        return NextResponse.json({ error: 'Este número de WhatsApp já está cadastrado em outra conta.' }, { status: 409 });
      }
    }

    // Atualiza dados na tabela usuarios
    const { error: dbError } = await supabaseAdmin.from('usuarios').update({
      nome,
      email,
      usuario,
      telefone,
      cpf,
      whatsapp,
      nivel,
      permissoes,
      // Atualizar tecnico_id quando o nível for alterado para técnico
      tecnico_id: nivel === 'tecnico' ? auth_user_id : null,
    }).eq('id', id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
} 