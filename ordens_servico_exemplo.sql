-- =====================================================
-- ORDENS DE SERVIÇO DE EXEMPLO - RICARDO OLIVEIRA
-- =====================================================
-- 
-- ATENÇÃO: Este script cria uma empresa e usuário de exemplo
-- e depois adiciona clientes e ordens de serviço.
--
-- =====================================================
-- CRIAÇÃO DA EMPRESA E USUÁRIO DE EXEMPLO
-- =====================================================

-- Criar empresa de exemplo (se não existir)
INSERT INTO empresas (id, nome, cnpj, email, telefone, endereco) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440001',
  'Assistência Técnica Ricardo Oliveira',
  '12.345.678/0001-90',
  'ricardo@assistenciatecnica.com',
  '(11) 99999-9999',
  'Rua das Flores, 123 - São Paulo/SP'
WHERE NOT EXISTS (
  SELECT 1 FROM empresas WHERE cnpj = '12.345.678/0001-90'
);

-- Criar usuário de exemplo (se não existir)
-- NOTA: auth_user_id será criado automaticamente pelo Supabase Auth
INSERT INTO usuarios (id, nome, email, nivel, empresa_id) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440002',
  'Ricardo Oliveira',
  'ricardo@assistenciatecnica.com',
  'admin',
  '550e8400-e29b-41d4-a716-446655440001'
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'ricardo@assistenciatecnica.com'
);

-- =====================================================
-- DADOS DE EXEMPLO - CLIENTES
-- =====================================================

-- Inserir alguns clientes de exemplo (se não existirem)
-- NOTA: Usando UUIDs de exemplo - substitua pelos IDs reais da sua empresa
INSERT INTO clientes (id, nome, email, telefone, celular, endereco, empresa_id, documento, numero_cliente, status, tipo, data_cadastro) 
SELECT '550e8400-e29b-41d4-a716-446655440003', 'João Silva', 'joao@email.com', '(11) 98888-1111', '(11) 98888-1111', 'Rua A, 100 - São Paulo/SP', '550e8400-e29b-41d4-a716-446655440001', '123.456.789-01', 1, 'ativo', 'pf', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'joao@email.com');

INSERT INTO clientes (id, nome, email, telefone, celular, endereco, empresa_id, documento, numero_cliente, status, tipo, data_cadastro) 
SELECT '550e8400-e29b-41d4-a716-446655440004', 'Maria Santos', 'maria@email.com', '(11) 97777-2222', '(11) 97777-2222', 'Rua B, 200 - São Paulo/SP', '550e8400-e29b-41d4-a716-446655440001', '987.654.321-00', 2, 'ativo', 'pf', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'maria@email.com');

INSERT INTO clientes (id, nome, email, telefone, celular, endereco, empresa_id, documento, numero_cliente, status, tipo, data_cadastro) 
SELECT '550e8400-e29b-41d4-a716-446655440005', 'Pedro Costa', 'pedro@email.com', '(11) 96666-3333', '(11) 96666-3333', 'Rua C, 300 - São Paulo/SP', '550e8400-e29b-41d4-a716-446655440001', '456.789.123-45', 3, 'ativo', 'pf', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'pedro@email.com');

INSERT INTO clientes (id, nome, email, telefone, celular, endereco, empresa_id, documento, numero_cliente, status, tipo, data_cadastro) 
SELECT '550e8400-e29b-41d4-a716-446655440006', 'Ana Oliveira', 'ana@email.com', '(11) 95555-4444', '(11) 95555-4444', 'Rua D, 400 - São Paulo/SP', '550e8400-e29b-41d4-a716-446655440001', '789.123.456-78', 4, 'ativo', 'pf', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'ana@email.com');

INSERT INTO clientes (id, nome, email, telefone, celular, endereco, empresa_id, documento, numero_cliente, status, tipo, data_cadastro) 
SELECT '550e8400-e29b-41d4-a716-446655440007', 'Carlos Ferreira', 'carlos@email.com', '(11) 94444-5555', '(11) 94444-5555', 'Rua E, 500 - São Paulo/SP', '550e8400-e29b-41d4-a716-446655440001', '321.654.987-00', 5, 'ativo', 'pf', NOW()
WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE email = 'carlos@email.com');

-- =====================================================
-- DADOS DE EXEMPLO - ORDENS DE SERVIÇO
-- =====================================================

-- Inserir ordens de serviço de exemplo (se não existirem)
-- NOTA: Usando UUIDs de exemplo - substitua pelos IDs reais
INSERT INTO ordens_servico (
  id, empresa_id, cliente_id, tecnico_id, status,
  atendente, tecnico, categoria, marca, modelo,
  servico, qtd_servico, peca, qtd_peca,
  relato, observacao, numero_os, data_entrega,
  valor_servico, valor_peca, valor_faturado, status_tecnico,
  data_cadastro, acessorios, condicoes_equipamento
) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440002',
  'concluida',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Notebook',
  'Dell',
  'Inspiron 15 3000',
  'Substituição da placa-mãe, reparo da tela, limpeza interna',
  1,
  'Placa-mãe nova, cabo flat da tela',
  1,
  'Tela não liga, notebook não inicia. Problema na placa-mãe e tela com defeito',
  'Cliente satisfeito com o serviço. Equipamento funcionando perfeitamente.',
  2024001,
  '2024-01-20',
  850.00,
  200.00,
  1050.00,
  'concluida',
  NOW(),
  'Carregador original Dell, cabo de alimentação',
  'Equipamento com sinais de uso normal, sem danos externos'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024001)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  'concluida',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Desktop',
  'HP',
  'Pavilion Desktop',
  'Substituição do HD por SSD, upgrade de memória RAM',
  1,
  'SSD 256GB, memória RAM 8GB',
  1,
  'Computador muito lento, travando constantemente. HD com bad sectors e pouca memória RAM',
  'Performance melhorou significativamente. Cliente muito satisfeito.',
  2024002,
  '2024-01-25',
  420.00,
  150.00,
  570.00,
  'concluida',
  NOW(),
  'Mouse e teclado originais HP',
  'Equipamento com poeira interna, necessita limpeza'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024002)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440002',
  'em_andamento',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Impressora',
  'Epson',
  'L355',
  'Substituição do rolo de papel, limpeza do cabeçote',
  1,
  'Rolo de papel novo',
  1,
  'Impressora não imprime, trava ao tentar imprimir. Rolo de papel danificado e cabeçote sujo',
  'Aguardando chegada da peça. Cliente informado.',
  2024003,
  '2024-01-28',
  180.00,
  50.00,
  230.00,
  'em_andamento',
  NOW(),
  'Cabo USB original Epson',
  'Impressora com tinta seca, cabeçote sujo'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024003)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440002',
  'aguardando_peca',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Tablet',
  'Samsung',
  'Galaxy Tab A',
  'Substituição da tela LCD',
  1,
  'Tela LCD nova',
  1,
  'Tela quebrada após queda. Tela LCD quebrada, necessário substituição',
  'Peça solicitada ao fornecedor. Prazo estimado: 5 dias.',
  2024004,
  '2024-02-05',
  350.00,
  250.00,
  600.00,
  'aguardando_peca',
  NOW(),
  'Capa protetora Samsung, carregador original',
  'Tablet com tela quebrada, restante em bom estado'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024004)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440002',
  'concluida',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Notebook',
  'Lenovo',
  'IdeaPad 320',
  'Remoção de vírus, formatação e reinstalação do sistema',
  1,
  'Nenhuma peça trocada',
  0,
  'Computador com muitos vírus, muito lento. Sistema infectado com múltiplos malwares',
  'Sistema limpo e funcionando. Backup dos dados realizado.',
  2024005,
  '2024-02-02',
  120.00,
  0.00,
  120.00,
  'concluida',
  NOW(),
  'Carregador original Lenovo',
  'Notebook com vírus, sistema lento'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024005)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440002',
  'aberta',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Desktop',
  'Dell',
  'OptiPlex 3050',
  'Substituição da placa de rede',
  1,
  'Placa de rede nova',
  1,
  'Não conecta na internet, placa de rede com problema. Placa de rede com defeito',
  'Equipamento em análise. Orçamento aprovado pelo cliente.',
  2024006,
  '2024-02-05',
  280.00,
  120.00,
  400.00,
  'em_atendimento',
  NOW(),
  'Mouse e teclado Dell',
  'Desktop com problema de rede'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024006)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440002',
  'concluida',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Impressora',
  'HP',
  'LaserJet Pro M404n',
  'Substituição do toner e limpeza do sensor',
  1,
  'Toner novo',
  1,
  'Impressora com erro de toner, não imprime. Toner vazio e sensor sujo',
  'Serviço rápido. Impressora funcionando normalmente.',
  2024007,
  '2024-02-03',
  95.00,
  80.00,
  175.00,
  'concluida',
  NOW(),
  'Cabo USB HP',
  'Impressora com toner vazio'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024007)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440015',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440002',
  'em_andamento',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Notebook',
  'Acer',
  'Aspire 5',
  'Substituição do teclado',
  1,
  'Teclado novo',
  1,
  'Teclado com algumas teclas que não funcionam. Teclado com defeito, necessário substituição',
  'Teclado recebido. Iniciando substituição.',
  2024008,
  '2024-02-07',
  220.00,
  180.00,
  400.00,
  'em_andamento',
  NOW(),
  'Carregador original Acer',
  'Notebook com teclado com defeito'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024008)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440002',
  'aberta',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Desktop',
  'HP',
  'Pavilion Desktop',
  'Substituição da placa de som',
  1,
  'Placa de som nova',
  1,
  'Sem som, alto-falantes não funcionam. Placa de som com defeito',
  'Aguardando aprovação do orçamento pelo cliente.',
  2024009,
  '2024-02-08',
  150.00,
  100.00,
  250.00,
  'em_atendimento',
  NOW(),
  'Mouse e teclado HP',
  'Desktop sem som'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024009)

UNION ALL

SELECT 
  '550e8400-e29b-41d4-a716-446655440017',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440002',
  'aguardando_peca',
  'Ricardo Oliveira',
  'Ricardo Oliveira',
  'Tablet',
  'iPad',
  'iPad 9ª Geração',
  'Substituição da bateria',
  1,
  'Bateria nova',
  1,
  'Bateria não carrega, desliga rapidamente. Bateria com defeito, necessário substituição',
  'Bateria solicitada ao fornecedor. Prazo estimado: 7 dias.',
  2024010,
  '2024-02-12',
  400.00,
  300.00,
  700.00,
  'aguardando_peca',
  NOW(),
  'Capa protetora iPad, carregador original',
  'iPad com bateria com defeito'
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico WHERE numero_os = 2024010);

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
--
-- VERSÃO ATUAL: Cria empresa, usuário, clientes e ordens de exemplo
-- 
-- O que este script faz:
-- 1. Cria uma empresa de exemplo (Assistência Técnica Ricardo Oliveira)
-- 2. Cria um usuário de exemplo (Ricardo Oliveira)
-- 3. Cria 5 clientes de exemplo
-- 4. Cria 10 ordens de serviço de exemplo
--
-- 3. VERIFIQUE OS DADOS:
--    SELECT COUNT(*) FROM empresas WHERE nome LIKE '%Ricardo%';
--    SELECT COUNT(*) FROM usuarios WHERE nome LIKE '%Ricardo%';
--    SELECT COUNT(*) FROM clientes WHERE empresa_id = '550e8400-e29b-41d4-a716-446655440001';
--    SELECT COUNT(*) FROM ordens_servico WHERE empresa_id = '550e8400-e29b-41d4-a716-446655440001';
--
-- ===================================================== 