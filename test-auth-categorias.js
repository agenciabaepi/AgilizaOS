const puppeteer = require('puppeteer');

async function testarAutenticacao() {
  console.log('🔍 Testando autenticação na página de categorias...\n');

  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Interceptar logs do console
    page.on('console', msg => {
      console.log('🖥️ Console:', msg.text());
    });

    // Interceptar erros
    page.on('pageerror', error => {
      console.log('❌ Erro na página:', error.message);
    });

    // Ir para a página de categorias
    console.log('📄 Navegando para /equipamentos/categorias...');
    await page.goto('http://localhost:3000/equipamentos/categorias', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Aguardar um pouco para a página carregar
    await page.waitForTimeout(3000);

    // Verificar se há redirecionamento para login
    const currentUrl = page.url();
    console.log('🌐 URL atual:', currentUrl);

    if (currentUrl.includes('/login')) {
      console.log('❌ PROBLEMA: Usuário foi redirecionado para login - não está autenticado');
      
      // Tentar fazer login (se necessário)
      console.log('🔑 Tentando fazer login...');
      // Aqui você pode adicionar código para fazer login automaticamente
      
    } else {
      console.log('✅ Usuário está na página de categorias');
      
      // Verificar o conteúdo da página
      const pageContent = await page.content();
      
      if (pageContent.includes('Nenhum grupo criado')) {
        console.log('❌ PROBLEMA: Página mostra "Nenhum grupo criado"');
      } else {
        console.log('✅ Página não mostra "Nenhum grupo criado"');
      }

      // Verificar se há dados carregados
      const grupos = await page.evaluate(() => {
        // Tentar encontrar elementos que indicam grupos carregados
        const grupoElements = document.querySelectorAll('[data-testid="grupo-item"], .grupo-item, .card');
        return grupoElements.length;
      });

      console.log('📊 Elementos de grupo encontrados na página:', grupos);

      // Verificar localStorage/sessionStorage para tokens
      const authData = await page.evaluate(() => {
        return {
          localStorage: Object.keys(localStorage).filter(key => 
            key.includes('auth') || key.includes('token') || key.includes('supabase')
          ),
          sessionStorage: Object.keys(sessionStorage).filter(key => 
            key.includes('auth') || key.includes('token') || key.includes('supabase')
          )
        };
      });

      console.log('🔐 Dados de autenticação encontrados:', authData);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    await browser.close();
  }
}

testarAutenticacao();