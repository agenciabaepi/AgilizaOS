const puppeteer = require('puppeteer');

async function testLoginAndCategorias() {
  let browser;
  try {
    console.log('Iniciando browser...');
    browser = await puppeteer.launch({ 
      headless: false, // Mostrar o browser para debug
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
    
    console.log('1. Navegando para a página de login...');
    await page.goto('http://localhost:3000/login', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    console.log('2. Preenchendo credenciais...');
    // Aguardar os campos aparecerem
    await page.waitForSelector('input[type="text"][placeholder*="e-mail"]', { timeout: 5000 });
    
    // Preencher email
    await page.type('input[type="text"][placeholder*="e-mail"]', 'techrodolfo@gmail.com');
    
    // Preencher senha
    await page.type('input[type="password"]', '123456');
    
    console.log('3. Fazendo login...');
    // Clicar no botão de login
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento ou sucesso
    await page.waitForTimeout(3000);
    
    console.log('4. Navegando para categorias...');
    await page.goto('http://localhost:3000/equipamentos/categorias', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Aguardar um pouco para capturar todos os logs
    await page.waitForTimeout(5000);
    
    console.log('5. Verificando se grupos aparecem...');
    const gruposText = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasNenhumGrupo: body.includes('Nenhum grupo criado'),
        hasGrupos: body.includes('Grupos') && !body.includes('Nenhum grupo criado'),
        bodyPreview: body.substring(0, 500)
      };
    });
    
    console.log('Resultado da verificação:', gruposText);
    
    console.log('Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (browser) {
      // Aguardar um pouco antes de fechar para ver o resultado
      await new Promise(resolve => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

testLoginAndCategorias();