const puppeteer = require('puppeteer');

async function testCategorias() {
  let browser;
  try {
    console.log('Iniciando teste da página de categorias...');
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar logs do console
    page.on('console', msg => console.log('CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    // Navegar para a página de categorias
    console.log('Navegando para http://localhost:3000/equipamentos/categorias');
    await page.goto('http://localhost:3000/equipamentos/categorias', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Aguardar um pouco para o carregamento
    await page.waitForTimeout(5000);
    
    // Verificar se há grupos na página
    const grupos = await page.$$eval('[data-testid="grupo-item"], .grupo-item, .card', elements => {
      return elements.length;
    });
    
    console.log(`Grupos encontrados na página: ${grupos}`);
    
    // Verificar se há texto indicando grupos
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasGrupoText = pageText.includes('grupo') || pageText.includes('Grupo');
    
    console.log(`Página contém texto relacionado a grupos: ${hasGrupoText}`);
    
    // Verificar se há loading ou erro
    const hasLoading = pageText.includes('Carregando') || pageText.includes('Loading');
    const hasError = pageText.includes('Erro') || pageText.includes('Error');
    
    console.log(`Página está carregando: ${hasLoading}`);
    console.log(`Página tem erro: ${hasError}`);
    
    console.log('Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro no teste:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testCategorias();