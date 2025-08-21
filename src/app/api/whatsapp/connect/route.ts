import { NextRequest, NextResponse } from 'next/server';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Declaração global para clientes ativos
declare global {
  // eslint-disable-next-line no-var
  var activeClients: Map<string, Client>;
}

if (!global.activeClients) {
  global.activeClients = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { empresa_id } = await request.json();

    if (!empresa_id) {
      return NextResponse.json(
        { error: 'Empresa ID é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🔔 WhatsApp: Iniciando conexão REAL para empresa: ${empresa_id}`);
    console.log(`🔔 WhatsApp: Estado atual de global.activeClients:`, global.activeClients);

    // Verificar se já existe um cliente ativo
    if (global.activeClients.has(empresa_id)) {
      console.log(`⚠️ WhatsApp: Cliente já existe para empresa: ${empresa_id}`);
      return NextResponse.json(
        { error: 'Cliente já está conectado' },
        { status: 400 }
      );
    }

    // Criar/atualizar sessão no banco
    const { error: upsertError } = await supabase
      .from('whatsapp_sessions')
      .upsert({
        empresa_id,
        status: 'connecting',
        qr_code: null,
        numero_whatsapp: '',
        nome_contato: '',
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.error('❌ WhatsApp: Erro ao criar/atualizar sessão no banco:', upsertError);
      return NextResponse.json(
        { error: 'Erro ao criar sessão no banco' },
        { status: 500 }
      );
    }

    console.log('✔ WhatsApp: Sessão criada/atualizada no banco');

    // Configurar diretório de sessão
    const sessionPath = path.join(process.cwd(), 'whatsapp-sessions', empresa_id);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    console.log('▲ WhatsApp: Inicializando cliente...');

    // Detectar se estamos em um ambiente Docker/VPS
    const isDocker = fs.existsSync('/.dockerenv');
    console.log('🐳 WhatsApp: Ambiente Docker detectado:', isDocker);

    // Configuração do Puppeteer adaptada para VPS/Docker
    const puppeteerConfig: { headless: boolean; args: string[]; executablePath?: string } = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-webgl',
        '--disable-3d-apis',
        '--disable-accelerated-2d-canvas',
        '--disable-features=VizDisplayCompositor',
        '--disable-dbus',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ]
    };

    // Tentar diferentes caminhos do Chrome/Chromium
    const chromePaths = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/opt/google/chrome/chrome'
    ];

    let executablePath: string | null = null;
    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        executablePath = chromePath;
        console.log(`✅ WhatsApp: Chrome encontrado em: ${chromePath}`);
        break;
      }
    }

    if (executablePath) {
      puppeteerConfig.executablePath = executablePath;
    } else {
      console.log('⚠️ WhatsApp: Chrome não encontrado, usando padrão do sistema');
    }

    // Criar cliente WhatsApp com configuração otimizada para VPS
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: empresa_id,
        dataPath: sessionPath
      }),
      puppeteer: puppeteerConfig
    });

    // Eventos do cliente
    client.on('qr', async (qr) => {
      console.log('📱 WhatsApp: QR Code recebido');
      
      // Atualizar QR Code no banco
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          qr_code: qr,
          status: 'qr_ready',
          updated_at: new Date().toISOString()
        })
        .eq('empresa_id', empresa_id);

      if (updateError) {
        console.error('❌ WhatsApp: Erro ao atualizar QR Code no banco:', updateError);
      } else {
        console.log('✔ WhatsApp: QR Code atualizado no banco');
      }
    });

    client.on('ready', async () => {
      console.log('✅ WhatsApp: Cliente pronto e conectado');
      
      // Atualizar status no banco
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'connected',
          qr_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('empresa_id', empresa_id);

      if (updateError) {
        console.error('❌ WhatsApp: Erro ao atualizar status no banco:', updateError);
      } else {
        console.log('✔ WhatsApp: Status atualizado para connected no banco');
      }
    });

    client.on('authenticated', () => {
      console.log('🔐 WhatsApp: Cliente autenticado');
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp: Falha na autenticação:', msg);
    });

    client.on('disconnected', async (reason) => {
      console.log('🔌 WhatsApp: Cliente desconectado:', reason);
      
      // Remover cliente da lista global
      global.activeClients.delete(empresa_id);
      
      // Atualizar status no banco
      const { error: updateError } = await supabase
        .from('whatsapp_sessions')
        .update({
          status: 'disconnected',
          qr_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('empresa_id', empresa_id);

      if (updateError) {
        console.error('❌ WhatsApp: Erro ao atualizar status no banco:', updateError);
      }
    });

    // Adicionar timeout para evitar travamento
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na inicialização do WhatsApp')), 60000);
    });

    // Inicializar cliente com timeout
    console.log('🚀 WhatsApp: Iniciando cliente...');
    await Promise.race([
      client.initialize(),
      timeoutPromise
    ]);

    // Adicionar cliente à lista global
    global.activeClients.set(empresa_id, client);

    console.log('✅ WhatsApp: Cliente inicializado com sucesso');

    return NextResponse.json({
      success: true,
      message: 'WhatsApp conectado com sucesso!',
      status: 'connecting'
    });

  } catch (error) {
    console.error('❌ WhatsApp: Erro ao conectar:', error);
    
    // Remover cliente da lista global em caso de erro se possível
    
    return NextResponse.json(
      { error: 'Erro interno do servidor: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}