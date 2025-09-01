import { NextRequest, NextResponse } from 'next/server'
import { verificarConfiguracao, enviarEmailVerificacao } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    console.log('🔍 Debug - Teste de configuração SMTP para:', email)

    // Teste 1: Verificar configuração SMTP
    console.log('🔍 Debug - Teste 1: Verificando configuração SMTP...')
    const configuracaoOk = await verificarConfiguracao()
    
    if (!configuracaoOk) {
      console.log('❌ Debug - Configuração SMTP inválida')
      return NextResponse.json({
        success: false,
        error: 'Configuração SMTP inválida',
        details: 'As configurações de email não estão corretas'
      }, { status: 500 })
    }

    console.log('✅ Debug - Configuração SMTP válida')

    // Teste 2: Tentar enviar email de teste
    console.log('🔍 Debug - Teste 2: Tentando enviar email de teste...')
    const codigoTeste = '123456'
    const emailEnviado = await enviarEmailVerificacao(email, codigoTeste, 'TESTE')

    if (!emailEnviado) {
      console.log('❌ Debug - Falha ao enviar email de teste')
      return NextResponse.json({
        success: false,
        error: 'Falha ao enviar email',
        details: 'O email não foi enviado, mas a configuração SMTP está correta'
      }, { status: 500 })
    }

    console.log('✅ Debug - Email de teste enviado com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Teste de email realizado com sucesso',
      details: 'Email de teste enviado para ' + email
    })

  } catch (error) {
    console.error('❌ Debug - Erro no teste de email:', error)
    return NextResponse.json({
      success: false,
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
