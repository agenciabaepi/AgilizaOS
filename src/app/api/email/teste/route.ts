import { NextRequest, NextResponse } from 'next/server'
import { enviarEmailVerificacao } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

           console.log('🔍 Debug - Teste de envio de email para:', email)

              // Tentar enviar email de teste
       console.log('🔍 Debug - Tentando enviar email de teste...')
       const codigoTeste = '123456'
       const emailEnviado = await enviarEmailVerificacao(email, codigoTeste, 'TESTE')

       if (!emailEnviado) {
         console.log('❌ Debug - Falha ao enviar email de teste')
         return NextResponse.json({
           success: false,
           error: 'Falha ao enviar email',
           details: 'O email não foi enviado'
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
