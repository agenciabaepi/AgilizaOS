'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiClipboard, FiSave, FiBox, FiTool, FiPlayCircle, FiX, FiCamera, FiTrash2, FiEdit, FiCheck, FiAlertCircle, FiLock } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import ProdutoServicoSearch from '@/components/ProdutoServicoSearch';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import ChecklistViewer from '@/components/ChecklistViewer';
import DynamicChecklist from '@/components/DynamicChecklist';

// Componente simples para exibir o padrão Android
const PatternDisplay = ({ pattern }: { pattern: string | number[] }) => {
  let positions: number[] = [];
  
  if (typeof pattern === 'string') {
    try {
      positions = JSON.parse(pattern);
    } catch {
      return <span className="text-gray-500">Padrão inválido</span>;
    }
  } else {
    positions = pattern;
  }
  
  if (!Array.isArray(positions) || positions.length === 0) {
    return <span className="text-gray-500">Nenhum padrão definido</span>;
  }
  
  return (
    <div className="grid grid-cols-3 gap-2 w-24 mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <div
          key={num}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
            positions.includes(num)
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-gray-100 border-gray-300 text-gray-500'
          }`}
        >
          {positions.includes(num) ? positions.indexOf(num) + 1 : ''}
        </div>
      ))}
    </div>
  );
};

export default function DetalheBancadaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { addToast, showModal } = useToast();
  const confirm = useConfirm();
  interface OrdemServico {
    id: string;
    empresa_id: string;
    cliente_id: string;
    tecnico_id: string;
    status: string;
    created_at: string;
    atendente: string;
    tecnico: string;
    categoria: string;
    marca: string;
    modelo: string;
    cor: string;
    numero_serie: string;
    servico: string;
    qtd_servico: string;
    peca: string;
    qtd_peca: string;
    termo_garantia: string | null;
    relato: string;
    observacao: string;
    data_cadastro: string;
    numero_os: string;
    data_entrega: string | null;
    vencimento_garantia: string | null;
    valor_peca: string;
    valor_servico: string;
    desconto: string | null;
    valor_faturado: string;
    status_tecnico: string;
    acessorios: string;
    condicoes_equipamento: string;
    cliente?: {
      nome: string;
    };
    [key: string]: unknown;
  }
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTecnico, setStatusTecnico] = useState('');
  const [laudo, setLaudo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [produtos, setProdutos] = useState<string>('');
  const [servicos, setServicos] = useState<string>('');
  const [salvando, setSalvando] = useState(false);
  const [statusTecnicoOptions, setStatusTecnicoOptions] = useState<{ id: string, nome: string }[]>([]);
  const [mostrarBotaoIniciar, setMostrarBotaoIniciar] = useState(false);
  
  // Estados para produtos e serviços selecionados
  const [produtosSelecionados, setProdutosSelecionados] = useState<Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
  }>>([]);
  const [servicosSelecionados, setServicosSelecionados] = useState<Array<{
    id: string;
    nome: string;
    preco: number;
  }>>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  
  // Estados para upload de imagens
  const [imagens, setImagens] = useState<File[]>([]);
  const [previewImagens, setPreviewImagens] = useState<string[]>([]);
  const [imagensExistentes, setImagensExistentes] = useState<string[]>([]);
  const [uploadingImagens, setUploadingImagens] = useState(false);
  
  // Estados para checklist e senha
  const [checklistData, setChecklistData] = useState<any>(null);
  const [checklistItens, setChecklistItens] = useState<any[]>([]);

  useEffect(() => {
    const fetchOS = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *, 
          cliente:cliente_id(nome), 
          senha_aparelho, 
          senha_padrao, 
          checklist_entrada
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        console.error('Erro ao carregar OS:', error);
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.error('OS não encontrada com ID:', id);
        setLoading(false);
        return;
      }
      
      if (data) {
        console.log('🔍 DEBUG BANCADA: Dados da OS carregados:', {
          id: data.id,
          numero_os: data.numero_os,
          relato: data.relato,
          tem_relato: !!data.relato,
          relato_length: data.relato?.length || 0
        });
        setOs(data);
        setEmpresaId(data.empresa_id);
        
        // Carregar imagens existentes
        if (data.imagens) {
          const urls = data.imagens.split(',').filter((url: string) => url.trim() !== '');
          setImagensExistentes(urls);
        }
        
        // Carregar dados do checklist
        if (data.checklist_entrada) {
          try {
            const checklistParsed = typeof data.checklist_entrada === 'string' 
              ? JSON.parse(data.checklist_entrada) 
              : data.checklist_entrada;
            setChecklistData(checklistParsed);
          } catch (error) {
            console.warn('Erro ao parsear checklist_entrada:', error);
            setChecklistData(null);
          }
        }
        
        // Buscar itens do checklist da empresa
        if (data.empresa_id) {
          const { data: itensData } = await supabase
            .from('checklist_itens')
            .select('*')
            .eq('empresa_id', data.empresa_id)
            .eq('ativo', true)
            .order('created_at');
          
          if (itensData) {
            setChecklistItens(itensData);
          }
        }
        
        // Definir status inicial baseado no status atual da OS
        let statusInicial = data.status_tecnico || '';
        
        if (!statusInicial) {
          // Se não há status técnico definido, usar o status da OS
          switch (data.status) {
            case 'ABERTA':
              statusInicial = 'AGUARDANDO INÍCIO';
              break;
            case 'EM_ANALISE':
              statusInicial = 'EM ANÁLISE';
              break;
            case 'AGUARDANDO_PECA':
              statusInicial = 'AGUARDANDO PEÇA';
              break;
            case 'CONCLUIDO':
              statusInicial = 'REPARO CONCLUÍDO';
              break;
            default:
              statusInicial = 'AGUARDANDO INÍCIO';
          }
        }
        
        setStatusTecnico(statusInicial);
        setLaudo(data.laudo || '');
        setObservacoes(data.observacao || '');
        setProdutos(data.peca || '');
        setServicos(data.servico || '');
        
        // Inicializar produtos e serviços selecionados como arrays vazios
        // (Os campos JSON não existem na tabela ainda)
        setProdutosSelecionados([]);
        setServicosSelecionados([]);
        
        // Mostrar botão iniciar se estiver aguardando início
        setMostrarBotaoIniciar(statusInicial === 'AGUARDANDO INÍCIO');
      }
      setLoading(false);
    };
    if (id) fetchOS();
  }, [id]);

  useEffect(() => {
    async function fetchStatusTecnico() {
      // Status padrão do técnico
      const statusPadrao = [
        { id: '1', nome: 'AGUARDANDO INÍCIO' },
        { id: '2', nome: 'EM ANÁLISE' },
        { id: '3', nome: 'ORÇAMENTO ENVIADO' },
        { id: '4', nome: 'AGUARDANDO PEÇA' },
        { id: '5', nome: 'EM EXECUÇÃO' },
        { id: '6', nome: 'SEM REPARO' },
        { id: '7', nome: 'REPARO CONCLUÍDO' }
      ];
      
      // Buscar status técnicos personalizados da empresa
      const { data: statusEmpresa } = await supabase
        .from('status')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      
      // Buscar status técnicos fixos do sistema
      const { data: statusFixos } = await supabase
        .from('status_fixo')
        .select('id, nome')
        .eq('tipo', 'tecnico');
      
      // Combinar todos os status e remover duplicatas
      const todosStatus = [
        ...statusPadrao,
        ...(statusFixos || []),
        ...(statusEmpresa || [])
      ];
      
      // ✅ CORRIGIDO: Remover duplicatas baseado no nome
      const statusUnicos = todosStatus.filter((status, index, array) => 
        array.findIndex(s => s.nome === status.nome) === index
      );
      
      setStatusTecnicoOptions(statusUnicos);
    }
    fetchStatusTecnico();
  }, []);

  const handleSalvar = async () => {
    // ✅ VALIDAÇÃO: Verificar se ID e OS existem antes de prosseguir
    if (!id) {
      addToast('error', 'Erro: ID da OS não encontrado. Recarregue a página.');
      return;
    }
    
    if (!os) {
      addToast('error', 'Erro: Dados da OS não carregados. Recarregue a página.');
      return;
    }
    
    setSalvando(true);
    
    try {
      // Upload de imagens primeiro
      const novasImagens = await uploadImagens();
      
      // Atualizar status da OS baseado no status técnico
      let novoStatus = os?.status;
      if (statusTecnico === 'EM ANÁLISE') {
        novoStatus = 'EM_ANALISE';
      } else if (statusTecnico === 'AGUARDANDO PEÇA') {
        novoStatus = 'AGUARDANDO_PECA';
      } else if (statusTecnico === 'REPARO CONCLUÍDO') {
        novoStatus = 'CONCLUIDO';
      } else if (statusTecnico === 'AGUARDANDO INÍCIO') {
        novoStatus = 'ABERTA';
      }

      // Preparar dados dos produtos e serviços
      const produtosText = produtosSelecionados.map(p => 
        `${p.nome} (${p.quantidade}x) - ${formatPrice(p.preco * p.quantidade)}`
      ).join(', ');
      
      const servicosText = servicosSelecionados.map(s => 
        `${s.nome} - ${formatPrice(s.preco)}`
      ).join(', ');
      
      const totalProdutos = calcularTotalProdutos();
      const totalServicos = calcularTotalServicos();
      // Combinar imagens existentes com novas
      const todasImagens = [...imagensExistentes, ...novasImagens];
      const imagensString = todasImagens.join(',');

      // Preparar dados para salvar (sem campos JSON por enquanto)
      
      // ✅ CORREÇÃO CRÍTICA: Preservar dados existentes quando não há novos dados
      const updateData: any = {
        status: novoStatus,
        status_tecnico: statusTecnico,
        // ✅ PRESERVAR dados existentes se não há novos dados
        ...(laudo && { laudo }),
        ...(observacoes && { observacao: observacoes }),
        ...(produtosText && { peca: produtosText }),
        ...(servicosText && { servico: servicosText }),
        // ✅ PRESERVAR valores monetários - só atualizar se há produtos/serviços selecionados
        ...(produtosSelecionados.length > 0 && { valor_peca: calcularTotalProdutos().toString() }),
        ...(servicosSelecionados.length > 0 && { valor_servico: calcularTotalServicos().toString() }),
        ...((produtosSelecionados.length > 0 || servicosSelecionados.length > 0) && { 
          valor_faturado: (calcularTotalProdutos() + calcularTotalServicos()).toString() 
        }),
        // ✅ PRESERVAR imagens - só atualizar se há imagens
        ...(imagensString && { imagens: imagensString }),
        // ✅ SALVAR checklist se foi modificado
        ...(checklistData && { checklist_entrada: JSON.stringify(checklistData) })
      };
      
      console.log('🔍 DEBUG BANCADA: Iniciando salvamento...', {
        id,
        novoStatus,
        statusTecnico,
        updateData
      });
      
      // Campos JSON não existem na tabela ainda - pular esta parte
      
      // Usar nossa API que envia notificações WhatsApp
      const requestBody = {
        osId: id,
        newStatus: novoStatus,
        newStatusTecnico: statusTecnico,
        ...updateData
      };
      
      console.log('🔍 DEBUG BANCADA: Enviando requisição...', {
        url: '/api/ordens/update-status',
        body: requestBody,
        osId: id,
        temOsId: !!id,
        idType: typeof id,
        idValue: id,
        requestBodyKeys: Object.keys(requestBody),
        hasOsIdInBody: 'osId' in requestBody,
        osIdInBody: requestBody.osId
      });
      
      // Usar nossa API que envia notificações WhatsApp
      const response = await fetch('/api/ordens/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar ordem');
      }

      // Atualizar estado local
      if (os) {
        setOs({ 
          ...os, 
          status: novoStatus || os.status,
          valor_peca: calcularTotalProdutos().toString(),
          valor_servico: calcularTotalServicos().toString(),
          valor_faturado: (calcularTotalProdutos() + calcularTotalServicos()).toString(),
          imagens: imagensString
        });
      }

      // Limpar imagens temporárias
      setImagens([]);
      setPreviewImagens([]);
      setImagensExistentes(todasImagens);

      // Atualizar botão iniciar
      setMostrarBotaoIniciar(statusTecnico === 'AGUARDANDO INÍCIO');

      // Mostrar toast de sucesso
      addToast('success', 'Dados salvos com sucesso!');
      // Se enviou orçamento, emite notificação backend
      try {
        if (statusTecnico === 'ORÇAMENTO ENVIADO' && empresaId && id) {
          await fetch('/api/notificacoes/emitir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              empresa_id: empresaId,
              tipo: 'orcamento_enviado',
              os_id: id,
              mensagem: `OS #${os?.numero_os || ''} - orçamento enviado pelo técnico.`
            })
          });
        }
        
        // Se concluiu o reparo, emite notificação mais simples
        if (statusTecnico === 'REPARO CONCLUÍDO' && empresaId && id) {
          try {
            const response = await fetch('/api/notificacoes/emitir', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                empresa_id: empresaId,
                tipo: 'reparo_concluido',
                os_id: id,
                mensagem: `OS #${os?.numero_os || ''} - reparo concluído pelo técnico.`
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              } else {
              console.error('Erro ao enviar notificação:', response.status, response.statusText);
            }
          } catch (error) {
            console.error('Erro ao emitir notificação de reparo concluído:', error);
          }
        }
      } catch (e) {
        console.warn('Falha ao emitir notificação:', e);
      }
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      addToast('error', 'Erro ao salvar: ' + (error as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const handleIniciarOS = async () => {
    // ✅ VALIDAÇÃO: Verificar se ID existe antes de prosseguir
    if (!id) {
      addToast('error', 'Erro: ID da OS não encontrado. Recarregue a página.');
      return;
    }
    
    setSalvando(true);
    
    try {
      console.log('🔍 DEBUG BANCADA: Iniciando OS...', {
        id,
        temId: !!id,
        idType: typeof id,
        idValue: id
      });

      // Usar nossa API que registra histórico e envia notificações
      const response = await fetch('/api/ordens/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          osId: id,
          newStatus: 'EM_ANALISE',
          newStatusTecnico: 'EM ANÁLISE'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao iniciar ordem');
      }

      console.log('✅ DEBUG BANCADA: OS iniciada com sucesso:', result);

      // Atualizar estado local
      setStatusTecnico('EM ANÁLISE');
      setMostrarBotaoIniciar(false);
      
      if (os) {
        setOs({ ...os, status: 'EM_ANALISE', status_tecnico: 'EM ANÁLISE' });
      }

      addToast('success', 'OS iniciada com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao iniciar OS:', error);
      addToast('error', 'Erro ao iniciar OS: ' + (error as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  // Funções para adicionar produtos e serviços
  const handleAdicionarProduto = (produto: { id: string; nome: string; preco: number; tipo: string }) => {
    const produtoExistente = produtosSelecionados.find(p => p.id === produto.id);
    
    if (produtoExistente) {
      setProdutosSelecionados(prev => {
        const updated = prev.map(p => 
          p.id === produto.id 
            ? { ...p, quantidade: p.quantidade + 1 }
            : p
        );
        return updated;
      });
    } else {
      setProdutosSelecionados(prev => {
        const updated = [...prev, { ...produto, quantidade: 1 }];
        return updated;
      });
    }
  };

  const handleAdicionarServico = (servico: { id: string; nome: string; preco: number; tipo: string }) => {
    const servicoExistente = servicosSelecionados.find(s => s.id === servico.id);
    
    if (!servicoExistente) {
      setServicosSelecionados(prev => {
        const updated = [...prev, servico];
        return updated;
      });
    } else {
      }
  };

  const handleRemoverProduto = (produtoId: string) => {
    setProdutosSelecionados(prev => prev.filter(p => p.id !== produtoId));
  };

  const handleRemoverServico = (servicoId: string) => {
    setServicosSelecionados(prev => prev.filter(s => s.id !== servicoId));
  };
  
  const handleEditarProduto = (produtoId: string, novoNome: string, novoPreco: number, novaQuantidade: number) => {
    setProdutosSelecionados(prev => 
      prev.map(p => 
        p.id === produtoId 
          ? { ...p, nome: novoNome, preco: novoPreco, quantidade: novaQuantidade }
          : p
      )
    );
  };
  
  const handleEditarServico = (servicoId: string, novoNome: string, novoPreco: number) => {
    setServicosSelecionados(prev => 
      prev.map(s => 
        s.id === servicoId 
          ? { ...s, nome: novoNome, preco: novoPreco }
          : s
      )
    );
  };

  const handleAlterarQuantidade = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      handleRemoverProduto(produtoId);
      return;
    }
    
    setProdutosSelecionados(prev => 
      prev.map(p => 
        p.id === produtoId 
          ? { ...p, quantidade: novaQuantidade }
          : p
      )
    );
  };

  const calcularTotalProdutos = () => {
    let totalSelecionados = produtosSelecionados.reduce((total, produto) => {
      return total + (produto.preco * produto.quantidade);
    }, 0);
    
    // Se não há produtos selecionados, mas há valor existente na OS, usar o existente
    if (totalSelecionados === 0 && os && os.valor_peca) {
      totalSelecionados = parseFloat(os.valor_peca) || 0;
    }
    
    return totalSelecionados;
  };

  const calcularTotalServicos = () => {
    let totalSelecionados = servicosSelecionados.reduce((total, servico) => {
      return total + servico.preco;
    }, 0);
    
    // Se não há serviços selecionados, mas há valor existente na OS, usar o existente
    if (totalSelecionados === 0 && os && os.valor_servico) {
      totalSelecionados = parseFloat(os.valor_servico) || 0;
    }
    
    return totalSelecionados;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Funções para manipular imagens
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      addToast('warning', 'Algumas imagens foram ignoradas. Apenas imagens até 5MB são permitidas.');
    }
    
    setImagens(prev => [...prev, ...validFiles]);
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setPreviewImagens(prev => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    setImagens(prev => prev.filter((_, i) => i !== index));
    setPreviewImagens(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setImagensExistentes(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImagens = async () => {
    if (imagens.length === 0) return [];
    
    setUploadingImagens(true);
    const uploadedUrls: string[] = [];
    
    try {
      const formData = new FormData();
      formData.append('osId', id);
      
      imagens.forEach((file) => {
        formData.append('files', file);
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        console.error('Erro no upload das imagens:', uploadResult.error);
        addToast('error', 'Erro ao fazer upload das imagens: ' + uploadResult.error);
        return [];
      }

      uploadedUrls.push(...uploadResult.files.map((file: any) => file.url));
      
    } catch (error) {
      console.error('Erro no upload das imagens:', error);
      addToast('error', 'Erro inesperado no upload das imagens');
    } finally {
      setUploadingImagens(false);
    }
    
    return uploadedUrls;
  };

  // const steps = [
  //   { label: 'Orçamento', icon: <FiFileText /> },
  //   { label: 'Aberto', icon: <FiPlay /> },
  //   { label: 'Andamento', icon: <FiTool /> },
  //   { label: 'Concluído', icon: <FiCheck /> },
  //   { label: 'Faturado', icon: <FiDollarSign /> },
  //   { label: 'Finalizado', icon: <FiFlag /> }
  // ];

  if (loading) {
    return (
      <MenuLayout>
        <div className="px-10 py-8 max-w-7xl mx-auto text-center text-gray-500">Carregando OS...</div>
      </MenuLayout>
    );
  }

  if (!os) {
    return (
      <MenuLayout>
        <div className="px-10 py-8 max-w-7xl mx-auto text-center text-red-500">Ordem de serviço não encontrada.</div>
      </MenuLayout>
    );
  }

  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
  // const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
  // const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    
      <MenuLayout>
      <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-2 w-fit"
          >
            ← Voltar para Bancada
          </Button>
          
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              os.status === 'ABERTA' ? 'bg-yellow-100 text-yellow-800' :
              os.status === 'EM_ANALISE' ? 'bg-blue-100 text-blue-800' :
              os.status === 'AGUARDANDO_PECA' ? 'bg-orange-100 text-orange-800' :
              os.status === 'CONCLUIDO' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {os.status === 'ABERTA' ? 'Aguardando' :
               os.status === 'EM_ANALISE' ? 'Em Análise' :
               os.status === 'AGUARDANDO_PECA' ? 'Aguardando Peça' :
               os.status === 'CONCLUIDO' ? 'Concluído' : os.status}
            </span>
          </div>
        </div>
        
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-6">
          <FiClipboard className="text-blue-600" />
          Ordem #{os.numero_os || os.id}
        </h1>

        {/* Barra de progresso da OS (mock, pode ser melhorada com status reais) */}
        {/* ... manter steps ou adaptar conforme status reais ... */}

        <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4 sm:mb-6">
            <FiClipboard className="text-blue-600" />
            Detalhes da OS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Cliente</p>
              <p className="text-base text-gray-800 font-medium">{os.cliente?.nome || '---'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Aparelho</p>
              <p className="text-base text-gray-800">{aparelho || '---'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Número de Série</p>
              <p className="text-base text-gray-800">{os.numero_serie || '---'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Data de Entrada</p>
              <p className="text-base text-gray-800">
                {os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '---'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Valor Total</p>
              <p className="text-base font-semibold text-blue-600">
                {((parseFloat(os.valor_servico || '0') + parseFloat(os.valor_peca || '0'))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Atendente</p>
              <p className="text-base text-gray-800">{os.atendente || '---'}</p>
            </div>
          </div>
          
          {/* Debug do relato */}
          {(() => {
            console.log('🔍 DEBUG RENDERIZAÇÃO: Relato na bancada:', {
              tem_os: !!os,
              relato: os?.relato,
              tem_relato: !!os?.relato,
              relato_length: os?.relato?.length || 0
            });
            return null;
          })()}
          
          {os?.relato && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Relato do Cliente</p>
              <p className="text-sm text-gray-600 leading-relaxed">{os.relato}</p>
            </div>
          )}
          
          {/* Debug: Mostrar sempre se não tem relato */}
          {!os?.relato && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-2">⚠️ Debug: Relato não encontrado</p>
              <p className="text-sm text-yellow-700">
                OS ID: {os?.id}<br/>
                Relato: {os?.relato || 'null/undefined'}<br/>
                Tem relato: {os?.relato ? 'Sim' : 'Não'}
              </p>
            </div>
          )}
          
          {(os.acessorios || os.condicoes_equipamento) && (
            <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {os.acessorios && (
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Acessórios</p>
                  <p className="text-sm text-gray-600">{os.acessorios}</p>
                </div>
              )}
              {os.condicoes_equipamento && (
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Condições do Equipamento</p>
                  <p className="text-sm text-gray-600">{os.condicoes_equipamento}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-sm border border-gray-200 space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Status Técnico */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiClipboard className="text-blue-600" />
                Status Técnico
              </h2>
              <select
                className="w-full border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={statusTecnico}
                onChange={e => setStatusTecnico(e.target.value)}
              >
                <option value="">Selecione o status</option>
                {statusTecnicoOptions.map(option => (
                  <option key={option.id} value={option.nome}>{option.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Produtos utilizados */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiBox className="text-blue-600" />
              Produtos utilizados
            </h2>
            
            {/* Busca de produtos */}
            <ProdutoServicoSearch
              onSelect={handleAdicionarProduto}
              placeholder="Buscar produtos..."
              tipo="produto"
              empresaId={empresaId}
            />

            {/* Produtos salvos anteriormente - Editáveis */}
            {os && (os.peca || (os.valor_peca && parseFloat(os.valor_peca) > 0)) && produtosSelecionados.length === 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
                    <FiBox className="text-blue-600" size={18} />
                    Produtos já lançados
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Carregar produto existente para edição
                        const produtoExistente = {
                          id: 'existing-prod-' + os.id,
                          nome: os.peca || 'Produto existente',
                          preco: parseFloat(os.valor_peca || '0'),
                          quantidade: 1,
                          tipo: 'produto'
                        };
                        setProdutosSelecionados([produtoExistente]);
                      }}
                      size="sm"
                      className="bg-blue-600 text-white hover:bg-blue-700"
                      title="Editar produtos"
                    >
                      <FiEdit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Remover Produtos',
                          message: 'Tem certeza que deseja remover todos os produtos desta OS?',
                          confirmText: 'Remover',
                          cancelText: 'Cancelar'
                        });
                        
                        if (confirmed) {
                          // Limpar produtos existentes
                          setProdutos('');
                          // Forçar atualização dos totais
                          if (os) {
                            setOs({ ...os, peca: '', valor_peca: '0' });
                          }
                          addToast('success', 'Produtos removidos com sucesso!');
                        }
                      }}
                      variant="destructive"
                      size="sm"
                      title="Remover produtos"
                    >
                      <FiTrash2 size={14} className="mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <FiClipboard className="text-blue-600" size={14} />
                      <span className="text-sm font-medium text-blue-900">Descrição:</span>
                      <span className="text-sm text-blue-700">{os.peca || 'Não especificado'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-lg">💰</span>
                      <span className="text-sm font-medium text-blue-900">Valor Total:</span>
                      <span className="text-sm font-bold text-blue-800 bg-blue-200 px-2 py-1 rounded w-fit">
                        {formatPrice(parseFloat(os.valor_peca || '0'))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                    <FiAlertCircle size={12} />
                    <span className="italic">Clique em "Editar" para modificar os produtos</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Lista de produtos selecionados */}
            {produtosSelecionados.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Produtos selecionados para edição:</h3>
                <div className="space-y-2">
                  {produtosSelecionados.map((produto) => (
                    <div key={produto.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-700 w-16">Nome:</label>
                        <input
                          type="text"
                          value={produto.nome}
                          onChange={(e) => handleEditarProduto(produto.id, e.target.value, produto.preco, produto.quantidade)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Nome do produto"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-700 w-16">Preço:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={produto.preco}
                          onChange={(e) => handleEditarProduto(produto.id, produto.nome, parseFloat(e.target.value) || 0, produto.quantidade)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0,00"
                        />
                        <span className="text-sm text-gray-600">{formatPrice(produto.preco)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={produto.quantidade}
                          onChange={(e) => handleAlterarQuantidade(produto.id, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoverProduto(produto.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    Total produtos: {formatPrice(calcularTotalProdutos())}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Serviços realizados */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiTool className="text-blue-600" />
              Serviços realizados
            </h2>
            
            {/* Busca de serviços */}
            <ProdutoServicoSearch
              onSelect={handleAdicionarServico}
              placeholder="Buscar serviços..."
              tipo="servico"
              empresaId={empresaId}
            />

            {/* Serviços salvos anteriormente - Editáveis */}
            {os && (os.servico || (os.valor_servico && parseFloat(os.valor_servico) > 0)) && servicosSelecionados.length === 0 && (
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <h3 className="text-base font-semibold text-green-900 flex items-center gap-2">
                    <FiTool className="text-green-600" size={18} />
                    Serviços já lançados
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Carregar serviço existente para edição
                        const servicoExistente = {
                          id: 'existing-serv-' + os.id,
                          nome: os.servico || 'Serviço existente',
                          preco: parseFloat(os.valor_servico || '0'),
                          tipo: 'servico'
                        };
                        setServicosSelecionados([servicoExistente]);
                      }}
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                      title="Editar serviços"
                    >
                      <FiEdit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={async () => {
                        const confirmed = await confirm({
                          title: 'Remover Serviços',
                          message: 'Tem certeza que deseja remover todos os serviços desta OS?',
                          confirmText: 'Remover',
                          cancelText: 'Cancelar'
                        });
                        
                        if (confirmed) {
                          // Limpar serviços existentes
                          setServicos('');
                          // Forçar atualização dos totais
                          if (os) {
                            setOs({ ...os, servico: '', valor_servico: '0' });
                          }
                          addToast('success', 'Serviços removidos com sucesso!');
                        }
                      }}
                      variant="destructive"
                      size="sm"
                      title="Remover serviços"
                    >
                      <FiTrash2 size={14} className="mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-green-200">
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <FiClipboard className="text-green-600" size={14} />
                      <span className="text-sm font-medium text-green-900">Descrição:</span>
                      <span className="text-sm text-green-700">{os.servico || 'Não especificado'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-lg">💰</span>
                      <span className="text-sm font-medium text-green-900">Valor Total:</span>
                      <span className="text-sm font-bold text-green-800 bg-green-200 px-2 py-1 rounded w-fit">
                        {formatPrice(parseFloat(os.valor_servico || '0'))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                    <FiAlertCircle size={12} />
                    <span className="italic">Clique em "Editar" para modificar os serviços</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Lista de serviços selecionados */}
            {servicosSelecionados.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Serviços selecionados para edição:</h3>
                <div className="space-y-2">
                  {servicosSelecionados.map((servico) => (
                    <div key={servico.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-700 w-16">Nome:</label>
                        <input
                          type="text"
                          value={servico.nome}
                          onChange={(e) => handleEditarServico(servico.id, e.target.value, servico.preco)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Nome do serviço"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-700 w-16">Preço:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={servico.preco}
                          onChange={(e) => handleEditarServico(servico.id, servico.nome, parseFloat(e.target.value) || 0)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0,00"
                        />
                        <span className="text-sm text-gray-600">{formatPrice(servico.preco)}</span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleRemoverServico(servico.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">
                    Total serviços: {formatPrice(calcularTotalServicos())}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Laudo Técnico */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Laudo Técnico
            </h2>
            <textarea
              className="w-full border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              value={laudo}
              onChange={e => setLaudo(e.target.value)}
              placeholder="Descreva o diagnóstico técnico com todos os detalhes relevantes..."
            />
          </div>

          {/* Imagens do Equipamento */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiCamera className="text-blue-600" />
              Imagens do Equipamento
            </h2>
            
            {/* Upload de novas imagens */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="image-upload-edit"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload-edit" className="cursor-pointer">
                  <div className="space-y-2">
                    <div className="text-4xl">📷</div>
                    <p className="text-sm text-gray-600">
                      Clique para selecionar imagens ou arraste aqui
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG até 5MB cada • Máximo 10 imagens
                    </p>
                    {imagens.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {imagens.length} imagem{imagens.length !== 1 ? 'ns' : ''} selecionada{imagens.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Preview das novas imagens */}
              {previewImagens.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Novas Imagens</h4>
                    <button
                      onClick={() => {
                        setImagens([]);
                        setPreviewImagens([]);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Limpar todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {previewImagens.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagens existentes */}
              {imagensExistentes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Imagens Existentes</h4>
                    <button
                      onClick={() => setImagensExistentes([])}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Remover todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {imagensExistentes.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Imagem ${index + 1}`}
                          className="w-full h-20 sm:h-24 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveExistingImage(index)}
                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações de Acesso do Aparelho */}
          {(os?.senha_aparelho || os?.senha_padrao) && (
            <div className="space-y-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FiLock className="text-yellow-600" />
                Informações de Acesso
              </h2>
              
              {os?.senha_aparelho && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Senha do Aparelho:
                  </label>
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <code className="text-lg font-mono text-blue-600">
                      {String(os.senha_aparelho)}
                    </code>
                  </div>
                </div>
              )}
              
              {os?.senha_padrao && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Padrão Android:
                  </label>
                  <div className="bg-white border border-gray-300 rounded-lg p-3">
                    <PatternDisplay pattern={os.senha_padrao as string | number[]} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Checklist de Entrada */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiCheck className="text-green-600" />
              Checklist de Entrada
            </h2>
            
            {checklistItens.length > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <DynamicChecklist
                  checklistItens={checklistItens}
                  value={checklistData || {}}
                  onChange={setChecklistData}
                  readOnly={false}
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Nenhum item de checklist configurado para esta empresa.
              </div>
            )}
          </div>

          {/* Observações técnicas */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiClipboard className="text-blue-600" />
              Observações técnicas
            </h2>
            <textarea
              className="w-full border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Observações adicionais do técnico..."
            />
          </div>

          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
            {mostrarBotaoIniciar && (
              <Button
                onClick={handleIniciarOS}
                disabled={salvando}
                className="inline-flex justify-center items-center gap-2 bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto"
                size="lg"
              >
                <FiPlayCircle size={16} /> 
                {salvando ? 'Iniciando...' : 'Iniciar OS'}
              </Button>
            )}
            
            <Button
              onClick={handleSalvar}
              disabled={salvando}
              size="lg"
              className="inline-flex justify-center items-center gap-2 w-full sm:w-auto"
            >
              <FiSave size={16} /> 
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
      </MenuLayout>
    
  );
}