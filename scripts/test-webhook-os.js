/**
 * Script de teste para webhook de criação de OS
 * Simula a criação de uma OS e dispara o webhook para o n8n
 * 
 * Uso: node scripts/test-webhook-os.js
 */

require('dotenv').config({ path: '.env.local' });

const WEBHOOK_URL = process.env.N8N_WEBHOOK_NOVA_OS_URL || 'https://gestaoconsert.app.n8n.cloud/webhook/consertos/nova-os';

const testPayload = {
  os_id: 'test-' + Date.now(),
  numero_os: 9999,
  status: 'ORÇAMENTO',
  cliente_nome: 'Cliente Teste Webhook',
  cliente_telefone: '12999887766',
  aparelho: 'NOTEBOOK',
  modelo: 'Dell Inspiron 15',
  defeito: 'Tela piscando e não liga',
  servico: 'Troca de tela e limpeza',
  tecnico_nome: 'Técnico Teste',
  tecnico_whatsapp: '5512991308740',
  link_os: 'https://gestaoconsert.com.br/ordens/test-9999'
};

async function testWebhook() {
  console.log('🧪 TESTE DE WEBHOOK N8N');
  console.log('═══════════════════════════════════════');
  console.log('URL:', WEBHOOK_URL);
  console.log('');
  console.log('📤 Payload de teste:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📡 Resposta do webhook:');
    console.log('Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('Body:', responseText);
    console.log('');

    if (response.ok) {
      console.log('✅ TESTE BEM-SUCEDIDO!');
      console.log('');
      console.log('📋 Verificações:');
      console.log('1. ✓ Webhook respondeu 200');
      console.log('2. ⏳ Aguarde alguns segundos');
      console.log('3. 📱 Verifique o WhatsApp:', testPayload.tecnico_whatsapp);
      console.log('');
      console.log('📋 Campos que devem aparecer na mensagem:');
      console.log('  - numero_os:', testPayload.numero_os);
      console.log('  - status:', testPayload.status);
      console.log('  - cliente_nome:', testPayload.cliente_nome);
      console.log('  - cliente_telefone:', testPayload.cliente_telefone);
      console.log('  - aparelho:', testPayload.aparelho);
      console.log('  - modelo:', testPayload.modelo);
      console.log('  - defeito:', testPayload.defeito);
      console.log('  - servico:', testPayload.servico);
    } else {
      console.log('❌ TESTE FALHOU!');
      console.log('O webhook retornou erro');
    }

  } catch (error) {
    console.error('❌ ERRO AO TESTAR WEBHOOK:', error.message);
    if (error.cause) {
      console.error('Causa:', error.cause);
    }
  }
}

// Executar teste
testWebhook().catch(console.error);

