import { NextRequest, NextResponse } from 'next/server';
import { generateOSPDF } from '@/lib/chromium';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { osId } = await request.json();
    
    if (!osId) {
      return NextResponse.json(
        { error: 'ID da OS é obrigatório' },
        { status: 400 }
      );
    }
    
    // Buscar dados da OS
    const { data: osData, error } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes!cliente_id(nome, telefone, email)
      `)
      .eq('id', osId)
      .single();
    
    if (error || !osData) {
      return NextResponse.json(
        { error: 'OS não encontrada' },
        { status: 404 }
      );
    }
    
    // Gerar PDF
    const pdfBuffer = await generateOSPDF(osData);
    
    // Retornar PDF como resposta
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OS-${osData.numero_os}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Erro ao gerar PDF da OS:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const osId = searchParams.get('osId');
  
  if (!osId) {
    return NextResponse.json(
      { error: 'ID da OS é obrigatório' },
      { status: 400 }
    );
  }
  
  try {
    // Buscar dados da OS
    const { data: osData, error } = await supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes!cliente_id(nome, telefone, email)
      `)
      .eq('id', osId)
      .single();
    
    if (error || !osData) {
      return NextResponse.json(
        { error: 'OS não encontrada' },
        { status: 404 }
      );
    }
    
    // Gerar PDF
    const pdfBuffer = await generateOSPDF(osData);
    
    // Retornar PDF como resposta
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="OS-${osData.numero_os}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Erro ao gerar PDF da OS:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
