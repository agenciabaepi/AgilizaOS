# Diagnóstico - Webhook N8N Nova OS

## Como verificar se o payload está correto

### 1. Verificar logs de PRODUÇÃO

Quando uma OS é criada em produção, você verá estes logs no Vercel:

```
[Webhook OS][PROD] payload: {
  "os_id": "uuid-da-os",
  "numero_os": 84,
  "status": "ORÇAMENTO",
  "cliente_nome": "Nome do Cliente",
  "cliente_telefone": "12991353971",
  "aparelho": "CAIXA DE SOM",
  "modelo": "JHGJH",
  "defeito": "GJ",
  "servico": "",
  "tecnico_nome": "techrodolfo",
  "tecnico_whatsapp": "5512974046426",
  "link_os": "https://gestaoconsert.com.br/ordens/uuid"
}

[Build] version=8d81607
[Webhook OS] URL: https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os
[Webhook OS] Ambiente: production
[Webhook OS] Response status: 200 OK
✅ N8N: Notificação enviada com sucesso. Response: { "ok": true }
```

### 2. Checklist de Diagnóstico

#### ✅ O log de PROD mostra `aparelho/modelo/defeito` preenchidos ANTES do POST?

**Se NÃO:**
- O problema está no mapeamento/busca no banco
- Verificar se a OS foi criada com esses campos preenchidos
- Verificar query SQL do select

**Se SIM:**
- O backend está correto
- Prossiga para o próximo passo

#### ✅ Está postando na Production URL do n8n?

Deve ser: `https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os`

**Se for Test URL** (`webhook-test/...`):
- Configurar variável `N8N_WEBHOOK_NOVA_OS_URL` no .env
- Verificar se está usando a URL correta no código

#### ✅ No n8n, a execução aparece no webhook de produção?

1. Acesse o n8n: https://gestaoconsert.app.n8n.cloud
2. Abra o workflow "Nova OS"
3. Clique em "Executions"
4. Verifique se aparecem execuções quando cria OS online

**Se NÃO aparecer:**
- O webhook pode estar configurado errado
- Verificar se o workflow está ATIVO
- Verificar se a URL está correta

**Se aparecer:**
- Clique na execução
- Veja os dados recebidos no nó Webhook
- Confirme se `aparelho`, `modelo`, `defeito` estão preenchidos

### 3. Problemas Comuns

#### Campos chegam vazios no n8n (mas logs mostram preenchidos)

**Causa:** Você está usando `.find()` ou outras expressões que sobrescrevem os valores

**Solução:** Use os campos diretos sem lógica:
```javascript
aparelho: ${$json.body.aparelho}
modelo: ${$json.body.modelo}
defeito: ${$json.body.defeito}
```

#### Campos mostram "Não especificado"

**Causa 1:** N8N está usando fallback nas expressões

**Solução:** Remova as variáveis `aparelho_final` e `defeito_final` do n8n

**Causa 2:** Campos realmente estão vazios no banco

**Solução:** Verificar se a OS foi criada com todos os campos preenchidos

#### URL errada do webhook

**Verificar:**
```bash
# No código
grep -r "gestaoconsert.app.n8n.cloud" src/

# Deve usar Production URL, não Test URL
```

### 4. Testando Manualmente

#### Teste direto do webhook (sem criar OS):

```bash
node scripts/test-webhook-os.js
```

Isso envia um payload de teste direto para o n8n.

#### Criar OS de teste:

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function teste() {
  const { data: tecnicos } = await supabase.from('usuarios').select('auth_user_id').eq('nivel', 'tecnico').limit(1);
  const { data: empresas } = await supabase.from('empresas').select('id').limit(1);
  const { data: clientes } = await supabase.from('clientes').select('id').limit(1);
  
  const { data: os } = await supabase.from('ordens_servico').insert([{
    empresa_id: empresas[0].id,
    cliente_id: clientes[0].id,
    tecnico_id: tecnicos[0].auth_user_id,
    equipamento: 'SMARTPHONE',
    marca: 'Apple',
    modelo: 'iPhone 15',
    problema_relatado: 'Tela quebrada',
    servico: 'Troca de tela',
    status: 'ORÇAMENTO'
  }]).select().single();
  
  console.log('✅ OS #' + os.numero_os + ' criada!');
  console.log('Verifique os logs do servidor');
}
teste();
"
```

### 5. Estrutura Final do N8N

No nó HTTP Request (WhatsApp), use:

**Body/Message:**
```javascript
{{ `*${$json.body.tecnico_nome || 'Técnico'}*, entrou uma nova OS!

📋 OS Nº: ${$json.body.numero_os}
📌 Status: ${$json.body.status}
👤 Cliente: ${$json.body.cliente_nome}
📱 Telefone: ${$json.body.cliente_telefone}

📦 Aparelho: ${$json.body.aparelho || '-'}
📱 Modelo: ${$json.body.modelo || '-'}

📝 Defeito: ${$json.body.defeito || '-'}
🔧 Serviço: ${$json.body.servico || '-'}

👉 Acesse: ${$json.body.link_os}` }}
```

**IMPORTANTE:** Use `||` para fallback, não `.find()` ou regex!

### 6. Variáveis de Ambiente

Adicione no Vercel (tanto Production quanto Preview):

```
N8N_WEBHOOK_NOVA_OS_URL=https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os
```

Isso garante que mesmo em diferentes ambientes, o webhook correto será usado.

