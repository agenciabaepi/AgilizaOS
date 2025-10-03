const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capturar todos os logs do console
  page.on('console', msg => {
    console.log('CONSOLE [' + msg.type() + ']:', msg.text());
  });
  
  try {
    console.log('1. Navegando para login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    console.log('2. Fazendo login...');
    await page.type('input[type="text"]', 'wdglp');
    await page.type('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    console.log('3. Aguardando redirecionamento...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log('4. Navegando para categorias...');
    await page.goto('http://localhost:3000/equipamentos/categorias', { waitUntil: 'networkidle0' });
    
    console.log('5. Aguardando 15 segundos para capturar todos os logs...');
    await page.waitForTimeout(15000);
    
    console.log('6. Verificando se há logs do useEffect...');
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    console.log('Logs capturados:', logs);
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
})();