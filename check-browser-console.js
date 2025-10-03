const puppeteer = require('puppeteer');

async function checkBrowserConsole() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capturar logs do console
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });
  
  // Capturar erros
  page.on('pageerror', error => {
    console.log('BROWSER ERROR:', error.message);
  });
  
  try {
    console.log('Navegando para a página de login...');
    await page.goto('http://localhost:3001/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('Aguardando página de login carregar...');
    await page.waitForTimeout(3000);
    
    // Verificar se há campos de login
    const emailField = await page.$('input[type="text"]');
    const passwordField = await page.$('input[type="password"]');
    
    if (emailField && passwordField) {
      console.log('Campos de login encontrados. Fazendo login...');
      
      // Preencher campos de login (usando credenciais de teste)
      await page.type('input[type="text"]', 'wdglp');
      await page.type('input[type="password"]', '123456');
      
      // Clicar no botão de login
      const loginButton = await page.$('button[type="submit"]');
      if (loginButton) {
        await loginButton.click();
        console.log('Botão de login clicado. Aguardando redirecionamento...');
        
        // Aguardar redirecionamento
        await page.waitForTimeout(5000);
        
        // Verificar se foi redirecionado
        const currentUrl = page.url();
        console.log('URL após login:', currentUrl);
        
        if (!currentUrl.includes('/login')) {
          console.log('Login realizado com sucesso! Navegando para categorias...');
          
          // Navegar para a página de categorias
          await page.goto('http://localhost:3001/equipamentos/categorias', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          
          console.log('Aguardando 5 segundos para capturar logs...');
          await page.waitForTimeout(5000);
          
          // Verificar se há grupos na página
          const gruposCount = await page.evaluate(() => {
            const grupos = document.querySelectorAll('[data-testid="grupo"]');
            return grupos.length;
          });
          
          console.log(`Grupos encontrados na página: ${gruposCount}`);
          
          // Verificar se a mensagem "Nenhum grupo criado" está visível
          const nenhumGrupoVisible = await page.evaluate(() => {
            const element = document.querySelector('h3');
            return element && element.textContent.includes('Nenhum grupo criado');
          });
          
          console.log(`Mensagem "Nenhum grupo criado" visível: ${nenhumGrupoVisible}`);
          
        } else {
          console.log('Login falhou - ainda na página de login');
        }
      } else {
        console.log('Botão de login não encontrado');
      }
    } else {
      console.log('Campos de login não encontrados');
    }
    
  } catch (error) {
    console.error('Erro ao verificar página:', error);
  } finally {
    await browser.close();
  }
}

checkBrowserConsole();