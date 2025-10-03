const puppeteer = require('puppeteer');

async function testCategoriasPage() {
  let browser;
  try {
    console.log('Iniciando teste da página de categorias...');
    
    browser = await puppeteer.launch({ 
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar logs do console
    page.on('console', msg => {
      console.log('CONSOLE:', msg.text());
    });
    
    // Capturar erros
    page.on('error', err => {
      console.error('ERRO DA PÁGINA:', err.message);
    });
    
    console.log('Navegando para a página de categorias...');
    await page.goto('http://localhost:3000/equipamentos/categorias', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Aguardar um pouco para os logs aparecerem
    await page.waitForTimeout(5000);
    
    // Verificar se há grupos na página
    const grupos = await page.$$eval('[data-testid="grupo"]', elements => elements.length).catch(() => 0);
    console.log('Número de grupos encontrados na página:', grupos);
    
    // Verificar se há a mensagem "Nenhum grupo criado"
    const nenhumGrupo = await page.$('text=Nenhum grupo criado').catch(() => null);
    console.log('Mensagem "Nenhum grupo criado" encontrada:', !!nenhumGrupo);
    
    // Aguardar mais um pouco
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testCategoriasPage();