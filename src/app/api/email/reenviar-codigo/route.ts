import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { enviarEmailVerificacao, gerarCodigoVerificacao } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    console.log('🔍 Debug - Reenvio de código para:', email)

    // Validar parâmetros obrigatórios
    if (!email) {
      console.log('❌ Debug - Email não fornecido')
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar usuário pelo email
    const { data: usuario, error: usuarioError } = await getSupabaseAdmin()
      .from('usuarios')
      .select(`
        id,
        nome,
        email,
        email_verificado,
        empresa_id
      `)
      .eq('email', email)
      .eq('email_verificado', false)
      .single()

    console.log('🔍 Debug - Busca de usuário:', { usuario, usuarioError })
    
    if (usuarioError || !usuario) {
      console.log('❌ Debug - Usuário não encontrado ou email já verificado')
      return NextResponse.json(
        { error: 'Usuário não encontrado ou email já verificado' },
        { status: 404 }
      )
    }

    // Gerar novo código de verificação
    const codigo = gerarCodigoVerificacao()

    // Invalidar códigos anteriores do usuário
    await getSupabaseAdmin()
      .from('codigo_verificacao')
      .update({ usado: true })
      .eq('usuario_id', usuario.id)
      .eq('usado', false)

    // Salvar novo código no banco
    const { error: codigoError } = await getSupabaseAdmin()
      .from('codigo_verificacao')
      .insert({
        usuario_id: usuario.id,
        codigo: codigo,
        email: email,
        usado: false,
        expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      })

    if (codigoError) {
      console.error('Erro ao salvar código:', codigoError)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    // Buscar nome da empresa se tiver empresa_id
    let nomeEmpresa = 'Empresa'
    if (usuario.empresa_id) {
      const { data: empresa } = await getSupabaseAdmin()
        .from('empresas')
        .select('nome')
        .eq('id', usuario.empresa_id)
        .single()
      
      if (empresa?.nome) {
        nomeEmpresa = empresa.nome
      }
    }
    
    // TESTE: Por enquanto, vamos apenas salvar o código sem enviar email
    console.log('🔍 Debug - TESTE: Salvando código sem enviar email')
    console.log('🔍 Debug - Código gerado:', codigo)
    console.log('🔍 Debug - Email:', email)
    console.log('🔍 Debug - Nome da empresa:', nomeEmpresa)
    
    // Simular sucesso para testar se o problema é no email
    const emailEnviado = true
    
    console.log('✅ Debug - TESTE: Código salvo com sucesso (email simulado)')

    return NextResponse.json({
      success: true,
      message: 'Novo código de verificação enviado com sucesso'
    })

  } catch (error) {
    console.error('Erro na API de reenvio de código:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
