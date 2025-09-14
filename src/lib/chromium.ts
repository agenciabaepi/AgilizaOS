import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// Configuração do Chromium para Vercel
export const getChromiumExecutablePath = () => {
  if (process.env.NODE_ENV === 'production') {
    return chromium.executablePath();
  }
  // Para desenvolvimento local, usar Chrome instalado
  return process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
};

// Configurações otimizadas para Vercel
export const getChromiumOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    args: isProduction ? chromium.args() : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    executablePath: getChromiumExecutablePath(),
    headless: true,
    ignoreHTTPSErrors: true,
  };
};

// Função para gerar PDF
export const generatePDF = async (html: string, options?: {
  format?: 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}) => {
  let browser;
  
  try {
    browser = await puppeteer.launch(getChromiumOptions());
    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ width: 1200, height: 800 });
    
    // Definir conteúdo HTML
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Gerar PDF
    const pdf = await page.pdf({
      format: options?.format || 'A4',
      margin: options?.margin || {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: options?.printBackground || true,
      displayHeaderFooter: options?.displayHeaderFooter || false,
      headerTemplate: options?.headerTemplate || '',
      footerTemplate: options?.footerTemplate || '',
    });
    
    return pdf;
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Função para capturar screenshot
export const captureScreenshot = async (url: string, options?: {
  width?: number;
  height?: number;
  fullPage?: boolean;
  quality?: number;
}) => {
  let browser;
  
  try {
    browser = await puppeteer.launch(getChromiumOptions());
    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({ 
      width: options?.width || 1200, 
      height: options?.height || 800 
    });
    
    // Navegar para a URL
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Capturar screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: options?.fullPage || false,
      quality: options?.quality || 90,
    });
    
    return screenshot;
  } catch (error) {
    console.error('Erro ao capturar screenshot:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Função para automação de WhatsApp Web
export const setupWhatsAppWeb = async () => {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      ...getChromiumOptions(),
      userDataDir: '/tmp/whatsapp-sessions', // Diretório temporário para sessões
    });
    
    const page = await browser.newPage();
    
    // Configurar user agent para WhatsApp Web
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navegar para WhatsApp Web
    await page.goto('https://web.whatsapp.com', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Aguardar carregamento da página
    await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 60000 });
    
    return { browser, page };
  } catch (error) {
    console.error('Erro ao configurar WhatsApp Web:', error);
    throw error;
  }
};

// Função para enviar mensagem via WhatsApp Web
export const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  let browser;
  
  try {
    const { browser: browserInstance, page } = await setupWhatsAppWeb();
    browser = browserInstance;
    
    // Construir URL do WhatsApp
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    // Navegar para a conversa
    await page.goto(whatsappUrl, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Aguardar carregamento da conversa
    await page.waitForSelector('div[data-testid="conversation-compose-box-input"]', { timeout: 30000 });
    
    // Digitar mensagem
    await page.type('div[data-testid="conversation-compose-box-input"]', message);
    
    // Enviar mensagem
    await page.click('button[data-testid="compose-btn-send"]');
    
    // Aguardar envio
    await page.waitForTimeout(2000);
    
    return { success: true, message: 'Mensagem enviada com sucesso' };
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
    return { success: false, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// Função para gerar PDF de OS
export const generateOSPDF = async (osData: any) => {
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OS #${osData.numero_os}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #007bff;
          margin: 0;
        }
        .info-section {
          margin-bottom: 20px;
        }
        .info-section h3 {
          background-color: #f8f9fa;
          padding: 10px;
          margin: 0 0 10px 0;
          border-left: 4px solid #007bff;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          color: #666;
        }
        .info-value {
          margin-top: 5px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ORDEM DE SERVIÇO #${osData.numero_os}</h1>
        <p>Data: ${new Date(osData.created_at).toLocaleDateString('pt-BR')}</p>
      </div>
      
      <div class="info-section">
        <h3>Dados do Cliente</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Nome:</div>
            <div class="info-value">${osData.clientes?.nome || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Telefone:</div>
            <div class="info-value">${osData.clientes?.telefone || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email:</div>
            <div class="info-value">${osData.clientes?.email || 'Não informado'}</div>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h3>Dados do Equipamento</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Marca:</div>
            <div class="info-value">${osData.marca || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Modelo:</div>
            <div class="info-value">${osData.modelo || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Problema Relatado:</div>
            <div class="info-value">${osData.problema_relatado || 'Não informado'}</div>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <h3>Informações do Serviço</h3>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Status:</div>
            <div class="info-value">${osData.status || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Serviço:</div>
            <div class="info-value">${osData.servico || 'Não informado'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Observações:</div>
            <div class="info-value">${osData.observacoes || 'Nenhuma observação'}</div>
          </div>
        </div>
      </div>
      
      ${osData.orcamento ? `
      <div class="info-section">
        <h3>Orçamento</h3>
        <div class="info-value">${osData.orcamento}</div>
      </div>
      ` : ''}
      
      ${osData.laudo ? `
      <div class="info-section">
        <h3>Laudo Técnico</h3>
        <div class="info-value">${osData.laudo}</div>
      </div>
      ` : ''}
      
      <div class="footer">
        <p>Este documento foi gerado automaticamente pelo sistema AgilizaOS</p>
        <p>Data de geração: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
  `;
  
  return await generatePDF(html, {
    format: 'A4',
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    },
    printBackground: true
  });
};
