// =====================================================
// TESTE FINAL DA API UPDATE-STATUS
// =====================================================

const testAPIFinal = async () => {
    console.log('🔍 Testando API final...');
    
    // Testar em ambas as portas
    const ports = ['3000', '3001', '3002'];
    
    for (const port of ports) {
        console.log(`\n=== TESTANDO PORTA ${port} ===`);
        
        try {
            const response = await fetch(`http://localhost:${port}/api/ordens/update-status`, {
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

            console.log(`📊 Porta ${port} - Status:`, response.status);
            console.log(`📊 Porta ${port} - OK:`, response.ok);
            
            if (response.ok) {
                const result = await response.text();
                console.log(`✅ Porta ${port} - Sucesso:`, result);
                return { port, result };
            } else {
                const errorText = await response.text();
                console.log(`❌ Porta ${port} - Erro:`, errorText);
            }
            
        } catch (error) {
            console.log(`❌ Porta ${port} - Erro de conexão:`, error.message);
        }
    }
    
    console.log('\n❌ Nenhuma porta funcionou');
    return null;
};

// Executar teste
testAPIFinal();

