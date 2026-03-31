import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseClient';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const contaId = formData.get('contaId') as string;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo fornecido' }, { status: 400 });
    }

    if (!contaId) {
      return NextResponse.json({ error: 'ID da conta é obrigatório' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de arquivo não permitido. Use: JPG, PNG, PDF, DOC, DOCX ou TXT' 
      }, { status: 400 });
    }

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Arquivo muito grande. Máximo permitido: 10MB' 
      }, { status: 400 });
    }

    // Cliente autenticado via cookies (mesmo padrão já usado no projeto para uploads)
    const cookieStore = await cookies();
    const supabaseSsr = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const supabase = createAdminClient();

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `anexo_${contaId}_${timestamp}_${randomString}.${fileExtension}`;

    // Fazer upload do arquivo para o Supabase Storage com credencial de admin (bypass RLS)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('anexos-contas')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      const message = uploadError?.message || 'Erro ao fazer upload do arquivo';
      // Dica comum: bucket inexistente
      const hint = message.includes('not found') ? 'Verifique se o bucket "anexos-contas" existe e está público.' : undefined;
      return NextResponse.json({ 
        error: message,
        hint
      }, { status: 500 });
    }

    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('anexos-contas')
      .getPublicUrl(fileName);

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

    // Adicionar nova URL ao array de anexos
    const anexosExistentes = contaData.anexos_url || [];
    const novosAnexos = [...anexosExistentes, publicUrl];

    // Atualizar a conta com o novo anexo
    const { error: updateError } = await supabase
      .from('contas_pagar')
      .update({ anexos_url: novosAnexos })
      .eq('id', contaId);

    if (updateError) {
      console.error('Erro ao atualizar conta:', updateError);
      return NextResponse.json({ 
        error: 'Erro ao salvar anexo na conta' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      anexos: novosAnexos
    });

  } catch (error) {
    console.error('Erro na API upload anexo:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
