const puppeteer = require('puppeteer');

async function checkConsole() {
  let browser;
  try {
    console.log('Iniciando browser...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar logs do console
    page.on('console', msg => {
      console.log(`CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    // Capturar erros
    page.on('error', err => {
      console.log('PAGE ERROR:', err.message);
    });
    
    console.log('Navegando para a página...');
    await page.goto('http://localhost:3000/equipamentos/categorias', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Aguardar um pouco para capturar todos os logs
    await page.waitForTimeout(3000);
    
    console.log('Verificação concluída');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkConsole();