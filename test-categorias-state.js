const puppeteer = require('puppeteer');

async function testCategoriasState() {
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Interceptar logs do console
    page.on('console', msg => {
      console.log('CONSOLE [' + msg.type() + ']:', msg.text());
    });
    
    console.log('1. Navegando para a página de login...');
    await page.goto('http://localhost:3000/login');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    console.log('2. Fazendo login...');
    await page.type('input[type="text"]', 'wdglp');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    console.log('3. Aguardando redirecionamento...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log('4. Navegando para categorias...');
    await page.goto('http://localhost:3000/equipamentos/categorias');
    await page.waitForSelector('h1', { timeout: 10000 });
    
    console.log('5. Aguardando carregamento completo...');
    await page.waitForTimeout(5000);
    
    console.log('6. Verificando estado da página...');
    
    // Verificar se há logs específicos
    const hasEmpresaLogs = await page.evaluate(() => {
      return window.console.logs?.some(log => log.includes('empresaId')) || false;
    });
    
    // Verificar elementos na página
    const pageState = await page.evaluate(() => {
      const hasNenhumGrupo = document.body.textContent.includes('Nenhum grupo criado');
      const hasGrupos = document.querySelector('[data-testid="grupo-item"]') !== null;
      const hasCarregando = document.body.textContent.includes('Carregando');
      const hasErro = document.body.textContent.includes('Erro');
      
      return {
        hasNenhumGrupo,
        hasGrupos,
        hasCarregando,
        hasErro,
        bodyText: document.body.textContent.substring(0, 500)
      };
    });
    
    console.log('Estado da página:', pageState);
    
    // Aguardar mais um pouco para ver se algo muda
    console.log('7. Aguardando mais 10 segundos para verificar mudanças...');
    await page.waitForTimeout(10000);
    
    const finalState = await page.evaluate(() => {
      const hasNenhumGrupo = document.body.textContent.includes('Nenhum grupo criado');
      const hasGrupos = document.querySelector('[data-testid="grupo-item"]') !== null;
      
      return {
        hasNenhumGrupo,
        hasGrupos
      };
    });
    
    console.log('Estado final:', finalState);
    
    console.log('Teste concluído!');
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
}

testCategoriasState();