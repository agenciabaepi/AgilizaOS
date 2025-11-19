import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Gerar código de 6 dígitos aleatório
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Formatar número de telefone para WhatsApp
function formatWhatsAppNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
}

// Enviar código via WhatsApp usando a API existente
async function sendWhatsAppCode(phoneNumber: string, code: string): Promise<boolean> {
  try {
    const formattedPhone = formatWhatsAppNumber(phoneNumber);
    
    const message = `🔐 Código de Verificação - Admin SaaS

Seu código de verificação é:

*${code}*

Este código é válido por 10 minutos.

⚠️ Não compartilhe este código com ninguém.`;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/whatsapp/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: formattedPhone,
        message,
        useTemplate: false, // Mensagem simples sem template
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('❌ Erro ao enviar código via WhatsApp:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, whatsapp } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    if (!whatsapp) {
      return NextResponse.json(
        { ok: false, error: 'Número de WhatsApp é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o email é de um admin autorizado
    const allowedEmails = (process.env.PLATFORM_ADMIN_EMAILS || '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowedEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: 'Email não autorizado para acesso admin' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Invalidar códigos anteriores não usados para este email
    await supabase
      .from('admin_2fa_codes')
      .update({ expirado: true })
      .eq('email', email.toLowerCase())
      .eq('usado', false);

    // Gerar novo código
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar código no banco
    const { data: codeData, error: dbError } = await supabase
      .from('admin_2fa_codes')
      .insert({
        email: email.toLowerCase(),
        codigo: code,
        whatsapp: formatWhatsAppNumber(whatsapp),
        expires_at: expiresAt.toISOString(),
        usado: false,
        expirado: false,
        tentativas: 0,
      })
      .select()
      .single();

    if (dbError || !codeData) {
      console.error('❌ Erro ao salvar código 2FA:', dbError);
      return NextResponse.json(
        { ok: false, error: 'Erro ao gerar código' },
        { status: 500 }
      );
    }

    // Enviar código via WhatsApp
    const sent = await sendWhatsAppCode(whatsapp, code);

    if (!sent) {
      console.error('❌ Falha ao enviar código via WhatsApp');
      // Ainda retornamos sucesso para não expor o código
      // Mas o usuário não receberá o código
      return NextResponse.json({
        ok: false,
        error: 'Erro ao enviar código via WhatsApp. Verifique se o número está correto.',
      }, { status: 500 });
    }

    console.log(`✅ Código 2FA gerado e enviado para ${email} via WhatsApp ${formatWhatsAppNumber(whatsapp)}`);

    return NextResponse.json({
      ok: true,
      message: 'Código enviado com sucesso via WhatsApp',
      expires_at: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar código 2FA:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

