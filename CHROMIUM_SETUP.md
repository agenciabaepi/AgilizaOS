# 🚀 Configuração do Chromium Headless no Vercel

Este documento explica como o Chromium headless foi configurado no projeto AgilizaOS para funcionar no Vercel.

## 📋 Dependências Instaladas

```bash
npm install puppeteer-core @sparticuz/chromium
```

- **`puppeteer-core`**: Versão core do Puppeteer sem Chromium incluído
- **`@sparticuz/chromium`**: Chromium otimizado para Vercel e outras plataformas serverless

## ⚙️ Configurações

### 1. **vercel.json**
```json
{
  "build": {
    "env": {
      "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true",
      "PUPPETEER_EXECUTABLE_PATH": "/opt/render/project/.chromium/chromium"
    }
  }
}
```

### 2. **Variáveis de Ambiente**
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`: Evita download do Chromium durante build
- `PUPPETEER_EXECUTABLE_PATH`: Caminho para o executável do Chromium

## 🛠️ Funcionalidades Implementadas

### 1. **Geração de PDFs**
- **Arquivo**: `src/lib/chromium.ts`
- **Função**: `generatePDF()`
- **API**: `/api/pdf/gerar-os`
- **Componente**: `PDFGenerator.tsx`

**Uso:**
```typescript
import { generatePDF } from '@/lib/chromium';

const pdfBuffer = await generatePDF(html, {
  format: 'A4',
  margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
  printBackground: true
});
```

### 2. **Captura de Screenshots**
- **Função**: `captureScreenshot()`
- **Suporte**: URLs completas, viewport customizável

**Uso:**
```typescript
import { captureScreenshot } from '@/lib/chromium';

const screenshot = await captureScreenshot('https://example.com', {
  width: 1200,
  height: 800,
  fullPage: true
});
```

### 3. **Automação WhatsApp Web**
- **Função**: `sendWhatsAppMessage()`
- **API**: `/api/whatsapp/send`
- **Sessões**: Armazenadas em `/tmp/whatsapp-sessions`

**Uso:**
```typescript
import { sendWhatsAppMessage } from '@/lib/chromium';

const result = await sendWhatsAppMessage('5511999999999', 'Mensagem de teste');
```

## 📁 Estrutura de Arquivos

```
src/
├── lib/
│   └── chromium.ts              # Utilitários principais
├── app/
│   └── api/
│       ├── pdf/
│       │   └── gerar-os/
│       │       └── route.ts     # API para gerar PDFs de OS
│       └── whatsapp/
│           └── send/
│               └── route.ts     # API para enviar WhatsApp
└── components/
    └── PDFGenerator.tsx         # Componente React para gerar PDFs
```

## 🔧 Configurações Otimizadas

### **Para Produção (Vercel):**
```typescript
const options = {
  args: chromium.args(), // Argumentos otimizados para Vercel
  executablePath: chromium.executablePath(), // Caminho do Chromium
  headless: true,
  ignoreHTTPSErrors: true,
};
```

### **Para Desenvolvimento Local:**
```typescript
const options = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  ignoreHTTPSErrors: true,
};
```

## 🚀 Como Usar

### **1. Gerar PDF de OS:**
```typescript
// No componente React
<PDFGenerator osId="123" numeroOS="OS-001" />

// Ou via API
const response = await fetch('/api/pdf/gerar-os?osId=123');
const pdfBlob = await response.blob();
```

### **2. Enviar WhatsApp:**
```typescript
// Via API
const response = await fetch('/api/whatsapp/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phoneNumber: '5511999999999',
    message: 'Sua OS está pronta!'
  })
});
```

### **3. Capturar Screenshot:**
```typescript
import { captureScreenshot } from '@/lib/chromium';

const screenshot = await captureScreenshot('https://example.com');
```

## ⚠️ Limitações e Considerações

### **Vercel:**
- **Timeout**: Funções têm limite de 30 segundos (Pro) ou 10 segundos (Hobby)
- **Memória**: Limite de 1GB por função
- **Cold Start**: Primeira execução pode ser mais lenta

### **WhatsApp Web:**
- **QR Code**: Precisa ser escaneado manualmente na primeira vez
- **Sessões**: Armazenadas em `/tmp` (temporárias)
- **Rate Limiting**: WhatsApp tem limites de envio

### **PDFs:**
- **Tamanho**: PDFs grandes podem causar timeout
- **Imagens**: Suporte completo a CSS e imagens
- **Fontes**: Usa fontes do sistema

## 🔍 Troubleshooting

### **Erro de Build:**
```bash
# Verificar se as dependências estão instaladas
npm list puppeteer-core @sparticuz/chromium

# Reinstalar se necessário
npm install puppeteer-core @sparticuz/chromium
```

### **Erro de Execução:**
```bash
# Verificar caminho do Chromium
npm run chromium:test
```

### **Timeout no Vercel:**
- Reduzir complexidade do HTML
- Otimizar imagens
- Usar `maxDuration: 30` no `vercel.json`

## 📚 Recursos Adicionais

- [Documentação do @sparticuz/chromium](https://github.com/Sparticuz/chromium)
- [Puppeteer Core](https://pptr.dev/)
- [Vercel Functions](https://vercel.com/docs/functions)
- [WhatsApp Web API](https://web.whatsapp.com/)

## 🎯 Próximos Passos

1. **Implementar cache de sessões** para WhatsApp
2. **Adicionar templates** de PDF personalizáveis
3. **Implementar filas** para envio em massa
4. **Adicionar métricas** de performance
5. **Implementar retry** automático para falhas
