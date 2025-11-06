# Product Requirements Document (PRD) - Rotas Públicas do Sistema Consert

## 1. Visão do Produto
**Objetivo**: Descrever os requisitos e funcionalidades das rotas públicas (não autenticadas) do sistema Consert.

**Público-Alvo**: 
- Visitantes não autenticados
- Clientes que precisam acompanhar suas OS
- Usuários em processo de cadastro

## 2. Escopo do Produto - Rotas Públicas

### 2.1 Landing Page (/)
**Funcionalidades**:
- Exibir informações sobre o sistema
- Apresentar recursos e benefícios
- Mostrar preços e planos
- Links para cadastro e login
- Navegação para páginas legais (sobre, termos, políticas)
- Animações e efeitos visuais (scroll reveal, parallax, GSAP)
- Toggle de tema (dark/light mode)

**Testes Necessários**:
- Página carrega corretamente
- Navegação funciona
- Links de CTA redirecionam corretamente
- Animações funcionam
- Toggle de tema funciona
- Responsividade mobile

### 2.2 Página de Login (/login)
**Funcionalidades**:
- Formulário de login com email e senha
- Validação de campos
- Mensagens de erro
- Redirecionamento após login bem-sucedido
- Link para cadastro
- Link para recuperação de senha

**Testes Necessários**:
- Formulário carrega corretamente
- Validação de campos funciona
- Login com credenciais válidas funciona
- Mensagens de erro exibidas corretamente
- Links de navegação funcionam

### 2.3 Página de Cadastro (/cadastro)
**Funcionalidades**:
- Formulário de cadastro
- Validação de dados
- Criação de conta
- Verificação de email
- Redirecionamento após cadastro

**Testes Necessários**:
- Formulário carrega corretamente
- Validação funciona
- Cadastro bem-sucedido cria conta
- Mensagens de erro exibidas
- Redirecionamento funciona

### 2.4 Páginas Legais
**Rotas**:
- `/sobre` - Informações sobre a empresa
- `/termos` - Termos de uso
- `/politicas-privacidade` - Políticas de privacidade

**Funcionalidades**:
- Exibir conteúdo legal
- Navegação de volta para outras páginas

**Testes Necessários**:
- Páginas carregam corretamente
- Conteúdo é exibido
- Navegação funciona

### 2.5 Página de Planos (/planos)
**Funcionalidades**:
- Exibir planos de assinatura disponíveis
- Comparação de planos
- Botões de assinatura
- Efeitos visuais (mouse tracking)

**Testes Necessários**:
- Planos são exibidos corretamente
- Comparação funciona
- Botões de ação funcionam
- Efeitos visuais funcionam

### 2.6 Portal Público de OS (/os)
**Funcionalidades**:
- Busca de OS por número
- Escaneamento de QR code
- Visualização de status da OS
- Informações sobre acompanhamento

**Testes Necessários**:
- Página carrega corretamente
- Busca funciona
- Exibição de resultados funciona
- QR code scanner funciona (se implementado)

### 2.7 Páginas de Pagamento
**Rotas**:
- `/pagamentos/sucesso` - Confirmação de pagamento
- `/pagamentos/falha` - Falha no pagamento
- `/pagamentos/pendente` - Pagamento pendente

**Funcionalidades**:
- Exibir status do pagamento
- Mensagens apropriadas
- Ações de retry (se aplicável)

**Testes Necessários**:
- Páginas carregam corretamente
- Mensagens são exibidas
- Ações funcionam

### 2.8 Instruções de Verificação (/instrucoes-verificacao)
**Funcionalidades**:
- Instruções para verificação de email
- Links úteis

**Testes Necessários**:
- Página carrega corretamente
- Instruções são claras
- Links funcionam

## 3. Requisitos de Teste

### 3.1 Testes Funcionais
- Todas as rotas públicas devem ser acessíveis sem autenticação
- Navegação entre páginas públicas funciona
- Formulários validam corretamente
- Links e botões redirecionam corretamente

### 3.2 Testes de UI/UX
- Páginas são responsivas
- Elementos interativos funcionam
- Animações e efeitos visuais funcionam
- Tema (dark/light) funciona corretamente

### 3.3 Testes de Performance
- Páginas carregam em < 2 segundos
- Animações não travam a interface
- Imagens carregam corretamente

## 4. Rotas Públicas Definidas no Middleware
Conforme `middleware.ts`, as seguintes rotas são públicas:
- `/login`
- `/cadastro`
- `/`
- `/sobre`
- `/termos`
- `/politicas-privacidade`
- `/planos`
- `/pagamentos/sucesso`
- `/pagamentos/falha`
- `/pagamentos/pendente`
- `/instrucoes-verificacao`
- `/clear-auth`
- `/clear-cache`
- `/os` (e sub-rotas)

## 5. Foco dos Testes
**IMPORTANTE**: Os testes devem focar APENAS nas rotas públicas listadas acima. Rotas que requerem autenticação NÃO devem ser testadas neste ciclo.

