import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    // Buscar o arquivo de log mais recente
    const files = fs.readdirSync(publicDir)
      .filter(file => file.startsWith('debug-logs-') && file.endsWith('.txt'))
      .sort()
      .reverse(); // Mais recente primeiro
    
    if (files.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum arquivo de log encontrado' 
      }, { status: 404 });
    }
    
    const latestLogFile = files[0];
    const filePath = path.join(publicDir, latestLogFile);
    
    // Ler o conteúdo do arquivo
    const logContent = fs.readFileSync(filePath, 'utf8');
    
    // Retornar o conteúdo como texto
    return new NextResponse(logContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${latestLogFile}"`,
      },
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao baixar logs:', error);
    return NextResponse.json({ 
      error: 'Erro ao baixar logs', 
      details: error.message 
    }, { status: 500 });
  }
}
