# Webhook N8N - Nova OS

## Visão Geral

Quando uma nova Ordem de Serviço (OS) é criada no sistema, um webhook é disparado automaticamente para o n8n, que processa e envia uma notificação no WhatsApp do técnico responsável.

## Estrutura do Payload

O webhook envia um JSON com a seguinte estrutura:

```json
{
  "os_id": "uuid-da-os",
  "numero_os": 123,
  "status": "ORÇAMENTO",
  "cliente_nome": "Nome do Cliente",
  "cliente_telefone": "12999887766",
  "aparelho": "NOTEBOOK",
  "modelo": "Dell Inspiron 15",
  "defeito": "Tela piscando",
  "servico": "Troca de tela",
  "tecnico_nome": "Nome do Técnico",
  "tecnico_whatsapp": "5512991308740",
  "link_os": "https://gestaoconsert.com.br/ordens/uuid-da-os"
}
```

## Campos

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `os_id` | string (UUID) | ID único da OS | `"7210c6e7-91fe-4fab-80e0-35d66f9840bc"` |
| `numero_os` | number | Número sequencial da OS | `123` |
| `status` | string | Status atual da OS | `"ORÇAMENTO"`, `"APROVADO"`, etc |
| `cliente_nome` | string | Nome do cliente | `"João Silva"` |
| `cliente_telefone` | string | Telefone apenas dígitos | `"12999887766"` |
| `aparelho` | string | Tipo de equipamento | `"NOTEBOOK"`, `"SMARTPHONE"`, etc |
| `modelo` | string | Modelo do aparelho | `"Dell Inspiron 15"` |
| `defeito` | string | Problema relatado | `"Tela piscando"` |
| `servico` | string | Serviço a ser realizado | `"Troca de tela"` |
| `tecnico_nome` | string | Nome do técnico | `"Ana Clara"` |
| `tecnico_whatsapp` | string | WhatsApp com DDI | `"5512991308740"` |
| `link_os` | string | URL da OS no sistema | `"https://gestaoconsert.com.br/ordens/..."` |

## Sanitização de Dados

O sistema automaticamente:

1. **Remove valores inválidos**: "Não informado", "Não especificado", "-", "N/A"
2. **Retorna string vazia** quando o campo não tem valor válido
3. **Limpa telefones**: remove caracteres não numéricos
4. **Formata WhatsApp**: adiciona DDI 55 se necessário

## Configuração

### Variável de Ambiente

Adicione no `.env.local`:

```bash
N8N_WEBHOOK_NOVA_OS_URL=https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os
```

### Arquivos Envolvidos

- **Handler**: `src/app/api/ordens/criar/route.ts`
- **Helper**: `src/lib/sanitize-os-data.ts`
- **Função de envio**: `src/lib/n8n-nova-os.ts`
- **Script de teste**: `scripts/test-webhook-os.js`

## Testando

### 1. Teste direto do webhook

```bash
node scripts/test-webhook-os.js
```

### 2. Criar OS via banco

```bash
node -e "..." # Ver script de teste acima
```

### 3. Criar OS via interface

1. Acesse o sistema
2. Crie uma nova OS
3. Verifique os logs do servidor
4. Verifique o WhatsApp do técnico

## Logs

O sistema gera logs detalhados:

```
📱 N8N: Payload final sanitizado: {
  "os_id": "...",
  "numero_os": 17,
  "status": "ORÇAMENTO",
  ...
}

📱 N8N: Payload enviado para webhook: {...}

✅ N8N: Notificação enviada com sucesso. Response: { "ok": true }
```

## Troubleshooting

### Webhook não dispara

1. Verifique se `N8N_WEBHOOK_NOVA_OS_URL` está configurado
2. Verifique logs do servidor
3. Confirme que a OS foi criada com sucesso

### Campos vazios no n8n

1. Verifique se os dados estão no banco (`equipamento`, `modelo`, `problema_relatado`)
2. Verifique logs do payload sanitizado
3. Confirme que não são valores como "Não informado"

### WhatsApp não recebe

1. Confirme que o webhook retornou 200
2. Verifique executions do n8n
3. Confirme que o workflow está ativo
4. Verifique o número do WhatsApp do técnico

## N8N - Acessando Campos

No n8n, acesse os campos assim:

```javascript
{{ $json.body.numero_os }}
{{ $json.body.status }}
{{ $json.body.cliente_nome }}
{{ $json.body.aparelho }}
{{ $json.body.modelo }}
{{ $json.body.defeito }}
{{ $json.body.servico }}
{{ $json.body.tecnico_nome }}
{{ $json.body.tecnico_whatsapp }}
```

## Exemplo de Mensagem no N8N

```javascript
{{ `*${$json.body.tecnico_nome}*, entrou uma nova OS!

📋 OS Nº: ${$json.body.numero_os}
📌 Status: ${$json.body.status}
👤 Cliente: ${$json.body.cliente_nome}
📱 Telefone: ${$json.body.cliente_telefone}

📦 Aparelho: ${$json.body.aparelho}
📱 Modelo: ${$json.body.modelo}

📝 Defeito: ${$json.body.defeito}
🔧 Serviço: ${$json.body.servico}

👉 Acesse: ${$json.body.link_os}` }}
```

