// =====================================================
// TESTE SIMPLES DA API UPDATE-STATUS
// =====================================================

async function testUpdateStatusSimple() {
    console.log('🔍 Testando API /api/ordens/update-status...');
    
    try {
        // Dados mínimos para teste
        const response = await fetch('/api/ordens/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                osId: '124',
                newStatus: 'ORÇAMENTO',
                newStatusTecnico: 'em atendimento'
            }),
        });

        console.log('📊 Status da resposta:', response.status);
        console.log('📊 OK:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na API (texto):', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error('❌ Erro na API (JSON):', errorData);
            } catch (e) {
                console.error('❌ Não foi possível fazer parse do erro');
            }
            return;
        }

        const result = await response.json();
        console.log('✅ Sucesso na API:', result);
        return result;

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        console.error('❌ Tipo do erro:', error.name);
        console.error('❌ Mensagem:', error.message);
        return { error: error.message };
    }
}

// Executar teste
console.log('🚀 Iniciando teste simples...');
testUpdateStatusSimple();





