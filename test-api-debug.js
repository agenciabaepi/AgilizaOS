// =====================================================
// TESTE DEBUG DA API UPDATE-STATUS
// =====================================================

const testAPI = async () => {
    console.log('🔍 Testando API /api/ordens/update-status...');
    
    try {
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

        console.log('📊 Status:', response.status);
        console.log('📊 Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                console.error('❌ Erro JSON:', errorData);
            } catch (e) {
                console.error('❌ Não foi possível fazer parse do erro');
            }
            return;
        }

        const result = await response.json();
        console.log('✅ Sucesso:', result);
        return result;

    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        console.error('❌ Stack:', error.stack);
        return { error: error.message };
    }
};

// Executar teste
testAPI();

