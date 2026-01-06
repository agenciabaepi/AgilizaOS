'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FiClipboard, FiSave, FiBox, FiTool, FiPlayCircle, FiX, FiCamera, FiTrash2, FiEdit, FiCheck, FiAlertCircle, FiLock, FiArrowLeft, FiUser, FiDollarSign, FiMessageCircle, FiPackage, FiAlertTriangle, FiEdit3 } from 'react-icons/fi';
import MenuLayout from '@/components/MenuLayout';
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import ProdutoServicoManager from '@/components/ProdutoServicoManager';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import DynamicChecklist from '@/components/DynamicChecklist';
import ImageEditor from '@/components/ImageEditor';
import { useSubscription } from '@/hooks/useSubscription';
import LaudoEditor from '@/components/LaudoEditor';
import CollapsibleSection from '@/components/CollapsibleSection';

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
  const { temRecurso } = useSubscription();
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
  // Entrada (anexadas pelo atendente na criação/edição da OS)
  const [imagensEntradaExistentes, setImagensEntradaExistentes] = useState<string[]>([]);
  // Técnico (anexadas pelo técnico na bancada)
  const [imagensTecnicoNovas, setImagensTecnicoNovas] = useState<File[]>([]);
  const [previewImagensTecnico, setPreviewImagensTecnico] = useState<string[]>([]);
  const [imagensTecnicoExistentes, setImagensTecnicoExistentes] = useState<string[]>([]);
  const [uploadingImagens, setUploadingImagens] = useState(false);
  
  // Estado do editor de imagem
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingNewImage, setEditingNewImage] = useState<boolean>(false);
  const [editingExistingImage, setEditingExistingImage] = useState<boolean>(false);
  const [previewImagemUrl, setPreviewImagemUrl] = useState<string | null>(null);
  
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
          checklist_entrada,
          equipamento,
          problema_relatado
        `)
        .eq('id', id)
        .single();
        
      if (error) {
        setLoading(false);
        return;
      }
      
      if (!data) {
        setLoading(false);
        return;
      }
      
      if (data) {
        // Mapear problema_relatado para relato
        const osData = {
          ...data,
          relato: data.problema_relatado || data.relato
        };
          relato_length: osData.relato?.length || 0
        });
        setOs(osData);
        setEmpresaId(data.empresa_id);
        
        // Carregar imagens existentes (entrada / atendente)
        if (data.imagens) {
          const urlsEntrada = data.imagens.split(',').filter((url: string) => url.trim() !== '');
          setImagensEntradaExistentes(urlsEntrada);
        }
        // Carregar imagens do técnico (se a coluna existir)
        if ((data as any).imagens_tecnico) {
          const urlsTecnico = String((data as any).imagens_tecnico)
            .split(',')
            .filter((url: string) => url.trim() !== '');
          setImagensTecnicoExistentes(urlsTecnico);
        }
        
        // Carregar dados do checklist
        if (data.checklist_entrada) {
          try {
            const checklistParsed = typeof data.checklist_entrada === 'string' 
              ? JSON.parse(data.checklist_entrada) 
              : data.checklist_entrada;
            setChecklistData(checklistParsed);
          } catch (error) {
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
        
        // Carregar produtos e serviços existentes para edição
        if (data.peca) {
          const produtosParsed = parseTextToItems(data.peca, 'produto');
          // Filtrar itens inválidos (nome vazio, apenas números, etc)
          const produtosValidos = produtosParsed.filter(p => 
            p.nome && 
            p.nome.trim() !== '' && 
            !/^[\d\s]+$/.test(p.nome.trim()) && // Não apenas números
            p.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
          );
          setProdutosSelecionados(produtosValidos);
        } else {
          setProdutosSelecionados([]);
        }

        if (data.servico) {
          const servicosParsed = parseTextToItems(data.servico, 'servico');
          // Filtrar itens inválidos (nome vazio, apenas números, etc)
          const servicosValidos = servicosParsed.filter(s => 
            s.nome && 
            s.nome.trim() !== '' && 
            !/^[\d\s]+$/.test(s.nome.trim()) && // Não apenas números
            s.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
          );
          setServicosSelecionados(servicosValidos);
        } else {
          setServicosSelecionados([]);
        }
        
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
      // Filtrar apenas itens válidos antes de gerar o texto
      const produtosValidos = produtosSelecionados.filter(p => 
        p.nome && 
        p.nome.trim() !== '' && 
        !/^[\d\s]+$/.test(p.nome.trim()) && 
        p.nome.trim().length > 1
      );
      const produtosText = produtosValidos.length > 0 
        ? produtosValidos.map(p => {
            const preco = typeof p.preco === 'number' ? p.preco : parseFloat(String(p.preco || 0));
            const quantidade = typeof p.quantidade === 'number' ? p.quantidade : parseInt(String(p.quantidade || 1));
            const precoTotal = (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 1 : quantidade);
            return `${p.nome} (${quantidade}x) - ${formatPrice(precoTotal)}`;
          }).join(', ')
        : '';
      
      const servicosValidos = servicosSelecionados.filter(s => 
        s.nome && 
        s.nome.trim() !== '' && 
        !/^[\d\s]+$/.test(s.nome.trim()) && 
        s.nome.trim().length > 1
      );
      const servicosText = servicosValidos.length > 0
        ? servicosValidos.map(s => {
            const preco = typeof s.preco === 'number' ? s.preco : parseFloat(String(s.preco || 0));
            return `${s.nome} - ${formatPrice(isNaN(preco) ? 0 : preco)}`;
          }).join(', ')
        : '';
      
      const totalProdutos = calcularTotalProdutos();
      const totalServicos = calcularTotalServicos();
      // Combinar imagens do técnico existentes com novas
      const todasImagensTecnico = [...imagensTecnicoExistentes, ...novasImagens];
      const imagensTecnicoString = todasImagensTecnico.join(',');

      // Preparar dados para salvar (sem campos JSON por enquanto)
      
      // ✅ CORREÇÃO: Sempre atualizar produtos/serviços, mesmo que vazios (para permitir remoção)
      const updateData: any = {
        status: novoStatus,
        status_tecnico: statusTecnico,
        // ✅ Sempre atualizar produtos e serviços (permitir limpar quando removidos)
        peca: produtosText,
        servico: servicosText,
        // ✅ Sempre atualizar valores monetários (permitir zerar quando removidos)
        valor_peca: produtosValidos.length > 0 ? calcularTotalProdutos().toString() : '0',
        valor_servico: servicosValidos.length > 0 ? calcularTotalServicos().toString() : '0',
        valor_faturado: (produtosValidos.length > 0 || servicosValidos.length > 0) 
          ? (calcularTotalProdutos() + calcularTotalServicos()).toString() 
          : '0',
        // ✅ PRESERVAR dados existentes se não há novos dados (apenas para laudo e observações)
        ...(laudo && { laudo }),
        ...(observacoes && { observacao: observacoes }),
        // ✅ Imagens do técnico em coluna separada
        ...(imagensTecnicoString && { imagens_tecnico: imagensTecnicoString }),
        // ✅ SALVAR checklist se foi modificado
        ...(checklistData && { checklist_entrada: JSON.stringify(checklistData) })
      };
      
      // Remover campos de debug antes de enviar
      const { _debug, ...updateDataLimpo } = updateData;
      
      // Usar nossa API que envia notificações WhatsApp
      const requestBody = {
        osId: id,
        newStatus: novoStatus,
        newStatusTecnico: statusTecnico,
        ...updateDataLimpo
      };
      
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
        });
      }

      // Limpar imagens temporárias do técnico e atualizar listas
      setImagensTecnicoNovas([]);
      setPreviewImagensTecnico([]);
      setImagensTecnicoExistentes(todasImagensTecnico);

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
            }
          } catch (error) {
            // Erro ao emitir notificação
          }
        }
      } catch (e) {
        // Falha ao emitir notificação
      }
      
    } catch (error) {
      const errorMessage = (error as Error).message || 'Erro desconhecido ao salvar';
      addToast('error', `Erro ao atualizar status da OS: ${errorMessage}`);
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

      // Atualizar estado local
      setStatusTecnico('EM ANÁLISE');
      setMostrarBotaoIniciar(false);
      
      if (os) {
        setOs({ ...os, status: 'EM_ANALISE', status_tecnico: 'EM ANÁLISE' });
      }

      addToast('success', 'OS iniciada com sucesso!');
      
    } catch (error) {
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
    // Filtrar apenas itens válidos antes de calcular
    const produtosValidos = produtosSelecionados.filter(p => 
      p.nome && 
      p.nome.trim() !== '' && 
      !/^[\d\s]+$/.test(p.nome.trim()) && 
      p.nome.trim().length > 1
    );
    
    // Calcular apenas com produtos válidos selecionados
    // Se não há produtos válidos, retornar 0 (não usar valores antigos da OS)
    return produtosValidos.reduce((total, produto) => {
      const preco = typeof produto.preco === 'number' ? produto.preco : parseFloat(String(produto.preco || 0));
      const quantidade = typeof produto.quantidade === 'number' ? produto.quantidade : parseInt(String(produto.quantidade || 1));
      const valorItem = (isNaN(preco) ? 0 : preco) * (isNaN(quantidade) ? 1 : quantidade);
      return total + valorItem;
    }, 0);
  };

  const calcularTotalServicos = () => {
    // Filtrar apenas itens válidos antes de calcular
    const servicosValidos = servicosSelecionados.filter(s => 
      s.nome && 
      s.nome.trim() !== '' && 
      !/^[\d\s]+$/.test(s.nome.trim()) && 
      s.nome.trim().length > 1
    );
    
    // Calcular apenas com serviços válidos selecionados
    // Se não há serviços válidos, retornar 0 (não usar valores antigos da OS)
    return servicosValidos.reduce((total, servico) => {
      const preco = typeof servico.preco === 'number' ? servico.preco : parseFloat(String(servico.preco || 0));
      return total + (isNaN(preco) ? 0 : preco);
    }, 0);
  };

  // Função auxiliar para converter string de preço brasileiro para número
  const parsePrecoBrasileiro = (precoStr: string): number => {
    if (!precoStr) return 0;
    
    // Remover espaços
    let str = precoStr.trim();
    
    // Se tem vírgula, assume formato brasileiro: "1.234,56" ou "1234,56"
    if (str.includes(',')) {
      // Remover pontos (separadores de milhar) e substituir vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes('.')) {
      // Se só tem ponto, pode ser formato internacional "1234.56" ou brasileiro "1.234"
      // Verificar se tem mais de um ponto (formato brasileiro com milhar)
      const partes = str.split('.');
      if (partes.length > 2) {
        // Formato brasileiro: "1.234.567" - remover todos os pontos
        str = str.replace(/\./g, '');
      }
      // Se tem apenas um ponto, assumir que é decimal
    }
    
    const valor = parseFloat(str);
    return isNaN(valor) ? 0 : valor;
  };

  // Função para converter texto em itens estruturados (igual à página do atendente)
  const parseTextToItems = (texto: string, tipo: 'produto' | 'servico') => {
    if (!texto || texto.trim() === '') return [];
    
    const itens = [];
    
    // Tentar primeiro o formato com vírgulas (formato atual da bancada)
    const itensComVirgula = texto.split(',').filter(item => item.trim());
    if (itensComVirgula.length > 0) {
      for (const itemTexto of itensComVirgula) {
        if (tipo === 'produto') {
          // Formato: "Nome (2x) - R$ 100,00" ou "Nome (2x) - R$ 1.234,56"
          let match = itemTexto.match(/^(.+?)\s*\(\s*(\d+)\s*x\s*\)\s*-\s*R\$\s*([\d.,\s]+)\s*$/);
          if (match) {
            const precoTotal = parsePrecoBrasileiro(match[3]);
            const quantidade = parseInt(match[2]) || 1;
            // Preço unitário = preço total / quantidade
            const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
            if (precoUnitario > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                quantidade,
                preco: precoUnitario,
              });
              continue;
            }
          }
          // Tentar formato: "Nome - Qtd: X - Valor: R$ Y.YY"
          match = itemTexto.match(/^(.+?)\s*-\s*Qtd:\s*(\d+)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
          if (match) {
            const precoTotal = parsePrecoBrasileiro(match[3]);
            const quantidade = parseInt(match[2]) || 1;
            const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
            if (precoUnitario > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                quantidade,
                preco: precoUnitario,
              });
              continue;
            }
          }
        } else {
          // Formato: "Nome - R$ 100,00" ou "Nome - R$ 1.234,56"
          let match = itemTexto.match(/^(.+?)\s*-\s*R\$\s*([\d.,\s]+)\s*$/);
          if (match) {
            const preco = parsePrecoBrasileiro(match[2]);
            if (preco > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                preco: preco,
              });
              continue;
            }
          }
          // Tentar formato: "Nome - Valor: R$ Y.YY"
          match = itemTexto.match(/^(.+?)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
          if (match) {
            const preco = parsePrecoBrasileiro(match[2]);
            if (preco > 0) {
              itens.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                nome: match[1].trim(),
                preco: preco,
              });
              continue;
            }
          }
        }
      }
      if (itens.length > 0) {
        return itens;
      }
    }
    
    // Tentar formato com quebras de linha (formato do atendente)
    const linhas = texto.split('\n').filter(linha => linha.trim());
    
    for (const linha of linhas) {
      if (tipo === 'produto') {
        // Formato: "Nome - Qtd: X - Valor: R$ Y.YY"
        let match = linha.match(/^(.+?)\s*-\s*Qtd:\s*(\d+)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
        if (match) {
          const precoTotal = parsePrecoBrasileiro(match[3]);
          const quantidade = parseInt(match[2]) || 1;
          const precoUnitario = quantidade > 0 && precoTotal > 0 ? precoTotal / quantidade : 0;
          if (precoUnitario > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              quantidade,
              preco: precoUnitario,
            });
            continue;
          }
        }
      } else {
        // Formato: "Nome - Valor: R$ Y.YY"
        let match = linha.match(/^(.+?)\s*-\s*Valor:\s*R\$\s*([\d.,\s]+)$/);
        if (match) {
          const preco = parsePrecoBrasileiro(match[2]);
          if (preco > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              preco: preco,
            });
            continue;
          }
        }
        // Tentar outros formatos possíveis
        match = linha.match(/^(.+?)\s*-\s*([\d.,\s]+)$/); // "Nome - 160.00"
        if (match) {
          const preco = parsePrecoBrasileiro(match[2]);
          if (preco > 0) {
            itens.push({
              id: `temp-${Date.now()}-${Math.random()}`,
              nome: match[1].trim(),
              preco: preco,
            });
            continue;
          }
        }
      }
    }
    
    return itens;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Funções para manipular imagens (técnico)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      addToast('warning', 'Algumas imagens foram ignoradas. Apenas imagens até 5MB são permitidas.');
    }
    
    setImagensTecnicoNovas(prev => [...prev, ...validFiles]);
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setPreviewImagensTecnico(prev => [...prev, ...previews]);
  };

  const handleRemoveImage = (index: number) => {
    setImagensTecnicoNovas(prev => prev.filter((_, i) => i !== index));
    setPreviewImagensTecnico(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setImagensTecnicoExistentes(prev => prev.filter((_, i) => i !== index));
  };

  // Função para abrir editor de imagem
  const abrirEditorImagem = (imageUrl: string, index: number, isNew: boolean = false, isExisting: boolean = false) => {
    // Verificar se tem o recurso editor_foto
    if (!temRecurso('editor_foto')) {
      addToast('error', 'Editor de imagens disponível apenas no plano Ultra. Faça upgrade para acessar.');
      return;
    }
    
    setEditingImageUrl(imageUrl);
    setEditingImageIndex(index);
    setEditingNewImage(isNew);
    setEditingExistingImage(isExisting);
  };

  // Função para salvar imagem editada
  const salvarImagemEditada = async (editedImageUrl: string) => {
    if (editingImageIndex === null) return;

    try {
      if (editingNewImage) {
        // Se for uma imagem nova, converter URL editada para File
        const response = await fetch(editedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `imagem-editada-${Date.now()}.png`, { type: 'image/png' });
        
        // Substituir na lista de novas imagens
        const novasImagensList = [...imagensTecnicoNovas];
        novasImagensList[editingImageIndex] = file;
        setImagensTecnicoNovas(novasImagensList);
        
        // Atualizar preview
        const novasPreviews = [...previewImagensTecnico];
        novasPreviews[editingImageIndex] = editedImageUrl;
        setPreviewImagensTecnico(novasPreviews);
      } else if (editingExistingImage) {
        // Substituir a imagem na lista existente
        const novasImagensList = [...imagensTecnicoExistentes];
        novasImagensList[editingImageIndex] = editedImageUrl;
        setImagensTecnicoExistentes(novasImagensList);

        // Atualizar no banco de dados
        const imagensString = novasImagensList.join(',');
        const { error: updateError } = await supabase
          .from('ordens_servico')
          .update({ imagens_tecnico: imagensString })
          .eq('id', id);

        if (updateError) {
          addToast('error', 'Erro ao atualizar imagem editada');
          return;
        }
      }

      addToast('success', 'Imagem editada salva com sucesso!');
    } catch (error) {
      addToast('error', 'Erro ao salvar imagem editada');
    }
  };

  const uploadImagens = async () => {
    if (imagensTecnicoNovas.length === 0) return [];
    
    setUploadingImagens(true);
    const uploadedUrls: string[] = [];
    
    try {
      const formData = new FormData();
      formData.append('osId', id);
      
      imagensTecnicoNovas.forEach((file) => {
        formData.append('files', file);
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        addToast('error', 'Erro ao fazer upload das imagens: ' + uploadResult.error);
        return [];
      }

      uploadedUrls.push(...uploadResult.files.map((file: any) => file.url));
      
    } catch (error) {
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
        <div className="px-4 sm:px-6 py-8 max-w-full mx-auto text-center text-gray-500 text-sm sm:text-base">Carregando OS...</div>
      </MenuLayout>
    );
  }

  if (!os) {
    return (
      <MenuLayout>
        <div className="px-4 sm:px-6 py-8 max-w-full mx-auto text-center text-red-500 text-sm sm:text-base">Ordem de serviço não encontrada.</div>
      </MenuLayout>
    );
  }

  const aparelho = [os.categoria, os.marca, os.modelo, os.cor].filter(Boolean).join(' ');
  // const entrada = os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '';
  // const valor = ((os.valor_servico || 0) + (os.valor_peca || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MenuLayout>
      {/* Mobile-First Layout */}
      <div className="min-h-screen bg-gray-50 w-full max-w-full overflow-x-hidden">
        {/* Header Mobile App-like, Desktop Normal */}
        <div className="bg-white border-b border-gray-200 sticky lg:static top-0 z-50 safe-area-inset-top w-full max-w-full lg:max-w-7xl lg:mx-auto">
          <div className="px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 lg:py-4 w-full max-w-full">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => window.history.back()}
                className="text-blue-600 hover:text-blue-700 active:text-blue-800 p-2 -ml-2 lg:ml-0 rounded-lg hover:bg-blue-50 active:bg-blue-100 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              >
                <FiArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
              </button>
              
              <div className="flex-1 text-center px-2 min-w-0">
                <h1 className="text-base sm:text-lg lg:text-2xl font-semibold text-gray-900 truncate w-full">
                  OS #{os.numero_os || os.id}
                </h1>
              </div>
              
              <div className="min-w-[44px] min-h-[44px] shrink-0"></div> {/* Spacer for centering */}
            </div>
            
            {/* Status Badge */}
            <div className="flex justify-center mt-2 lg:mt-3 w-full">
              <span className={`inline-flex items-center px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 lg:py-2.5 rounded-full text-xs sm:text-sm lg:text-base font-medium shrink-0 ${
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

        {/* Content Container - Mobile Compacto, Desktop Espaçado */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 pb-36 lg:pb-8 max-w-full lg:max-w-7xl mx-auto overflow-x-hidden">
          
          {/* PARTE SUPERIOR: Resumo em Colunas */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
              {/* Coluna 1: Cliente */}
              <div className="bg-white rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiUser className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900">Cliente</h3>
              </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 lg:mb-3 break-words">{os.cliente?.nome || '---'}</p>
                <div className="space-y-1.5 lg:space-y-2 text-xs sm:text-sm lg:text-base text-gray-600">
                  <p className="break-words overflow-wrap-anywhere">Data: {os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '---'}</p>
                  <p className="break-words overflow-wrap-anywhere">Atendente: {os.atendente || '---'}</p>
            </div>
          </div>

              {/* Coluna 2: Aparelho */}
          <div className="bg-white rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiBox className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900">Aparelho</h3>
              </div>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-2 lg:mb-3 break-words overflow-wrap-anywhere">{aparelho || '---'}</p>
                <div className="space-y-1.5 lg:space-y-2 text-xs sm:text-sm lg:text-base text-gray-600">
                  {os.numero_serie && <p className="break-words overflow-wrap-anywhere">Série: {os.numero_serie}</p>}
                  {os.cor && <p className="break-words overflow-wrap-anywhere">Cor: {os.cor}</p>}
            </div>
          </div>

              {/* Coluna 3: Valor e Status */}
          <div className="bg-white rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-yellow-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiDollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" />
              </div>
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900">Valor Total</h3>
              </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mb-3 lg:mb-4 break-words overflow-wrap-anywhere">
              {((parseFloat(os.valor_servico || '0') + parseFloat(os.valor_peca || '0'))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-600 mb-2">Status Técnico</label>
            <select
                    className="w-full border border-gray-300 px-3 py-3 lg:py-2.5 rounded-lg text-sm lg:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white min-h-[44px]"
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
            </div>
            
            {/* Informações Adicionais - Sempre exibir */}
            {(os?.relato || os.acessorios || os.condicoes_equipamento || os?.senha_aparelho || os?.senha_padrao) && (
              <CollapsibleSection
                title="Informações Adicionais"
                subtitle="Relato, acessórios, condições do equipamento e senha"
                icon={<FiMessageCircle className="w-5 h-5 text-orange-600" />}
                defaultOpen={false}
              >
                <div className="space-y-4 lg:space-y-6 pt-2">
                  {/* Senha do Aparelho - Sempre exibir se existir */}
                  {os?.senha_aparelho && (
                    <div>
                      <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3 flex items-center gap-2">
                        <FiLock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
                        Senha do Aparelho
                      </h4>
                      <div className="bg-yellow-50 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-yellow-100 w-full overflow-x-auto">
                        <code className="text-lg lg:text-xl font-mono text-blue-600 break-all">
                          {String(os.senha_aparelho)}
                        </code>
                      </div>
                    </div>
                  )}
                  
                  {/* Padrão Android - Só exibir se existir */}
                  {os?.senha_padrao && (
                    <div>
                      <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3 flex items-center gap-2">
                        <FiLock className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-600" />
                        Padrão Android
                      </h4>
                      <div className="bg-yellow-50 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-yellow-100">
                        <PatternDisplay pattern={os.senha_padrao as string | number[]} />
                      </div>
                    </div>
                  )}
                  
                  {os?.relato && (
                    <div>
                      <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3 flex items-center gap-2">
                        <FiMessageCircle className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                        Relato do Cliente
                      </h4>
                      <div className="bg-orange-50 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-orange-100 w-full">
                        <p className="text-sm lg:text-base text-gray-700 leading-relaxed break-words overflow-wrap-anywhere w-full">{os.relato}</p>
                  </div>
                </div>
                  )}
                  {os.acessorios && (
                    <div className="w-full">
                      <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3 flex items-center gap-2">
                        <FiPackage className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 shrink-0" />
                        Acessórios
                      </h4>
                      <div className="bg-blue-50 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-blue-100 w-full">
                        <p className="text-sm lg:text-base text-gray-700 leading-relaxed break-words overflow-wrap-anywhere w-full">{os.acessorios}</p>
                    </div>
                    </div>
                  )}
                  {os.condicoes_equipamento && (
                    <div className="w-full">
                      <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 lg:mb-3 flex items-center gap-2">
                        <FiAlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 shrink-0" />
                        Condições do Equipamento
                      </h4>
                      <div className="bg-red-50 rounded-lg lg:rounded-xl p-3 lg:p-4 border border-red-100 w-full">
                        <p className="text-sm lg:text-base text-gray-700 leading-relaxed break-words overflow-wrap-anywhere w-full">{os.condicoes_equipamento}</p>
                </div>
              </div>
            )}
                      </div>
              </CollapsibleSection>
            )}
          </div>

          {/* PARTE INFERIOR: Área de Trabalho Completa */}
          <div className="space-y-4 lg:space-y-6 w-full max-w-full">


          {/* Materiais e Serviços - Colapsável */}
          <CollapsibleSection
            title="Materiais e Serviços"
            subtitle="Produtos utilizados e serviços realizados"
            icon={<FiTool className="w-5 h-5 text-green-600" />}
            defaultOpen={true}
          >
            <div className="space-y-6 pt-2">
              {/* Produtos e Serviços usando ProdutoServicoManager */}
              <ProdutoServicoManager
                tipo="produto"
                itens={produtosSelecionados.map(p => ({
                  id: p.id,
                  nome: p.nome,
                  preco: p.preco,
                  quantidade: p.quantidade,
                  total: p.preco * p.quantidade
                }))}
                onItensChange={(itens) => {
                  // Filtrar itens inválidos antes de atualizar
                  const itensValidos = itens.filter(item => 
                    item.nome && 
                    item.nome.trim() !== '' && 
                    !/^[\d\s]+$/.test(item.nome.trim()) && // Não apenas números
                    item.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
                  );
                  const novosProdutos = itensValidos.map(item => ({
                    id: item.id || `temp-${Date.now()}-${Math.random()}`,
                    nome: item.nome.trim(),
                    preco: item.preco || 0,
                    quantidade: item.quantidade || 1
                  }));
                  setProdutosSelecionados(novosProdutos);
                }}
              />
              
              <ProdutoServicoManager
                tipo="servico"
                itens={servicosSelecionados.map(s => ({
                  id: s.id,
                  nome: s.nome,
                  preco: s.preco,
                  quantidade: 1,
                  total: s.preco
                }))}
                onItensChange={(itens) => {
                  // Filtrar itens inválidos antes de atualizar
                  const itensValidos = itens.filter(item => 
                    item.nome && 
                    item.nome.trim() !== '' && 
                    !/^[\d\s]+$/.test(item.nome.trim()) && // Não apenas números
                    item.nome.trim().length > 1 // Nome com pelo menos 2 caracteres
                  );
                  const novosServicos = itensValidos.map(item => ({
                    id: item.id || `temp-${Date.now()}-${Math.random()}`,
                    nome: item.nome.trim(),
                    preco: item.preco || 0
                  }));
                  setServicosSelecionados(novosServicos);
                }}
                        />
                      </div>
          </CollapsibleSection>

          {/* Diagnóstico - Colapsável */}
          <CollapsibleSection
            title="Diagnóstico Técnico"
            subtitle="Laudo e observações do técnico"
            icon={<FiEdit className="w-5 h-5 text-purple-600" />}
            defaultOpen={true}
          >
            <div className="space-y-4 lg:space-y-6 pt-2 w-full max-w-full">
              <div className="w-full max-w-full">
                <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 sm:mb-3 lg:mb-4">Laudo Técnico</h4>
                <LaudoEditor
              value={laudo}
                  onChange={setLaudo}
              placeholder="Descreva o diagnóstico técnico com todos os detalhes relevantes..."
                  minHeight="180px"
            />
          </div>

              <div className="w-full max-w-full">
                <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-2 sm:mb-3 lg:mb-4">Observações Técnicas</h4>
                <textarea
                  className="w-full max-w-full border border-gray-300 px-3 sm:px-4 lg:px-5 py-2.5 sm:py-3 lg:py-4 rounded-lg sm:rounded-xl lg:rounded-2xl text-sm lg:text-base min-h-[100px] lg:min-h-[120px] focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors resize-none bg-white"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais do técnico..."
                />
              </div>
              </div>
          </CollapsibleSection>

          {/* Documentação - Colapsável */}
          <CollapsibleSection
            title="Documentação"
            subtitle="Imagens, checklist e informações de acesso"
            icon={<FiCamera className="w-5 h-5 text-indigo-600" />}
            defaultOpen={false}
          >
            <div className="space-y-6 lg:space-y-8 pt-2">
              {/* Upload de Imagens */}
              <div>
                <h4 className="text-sm lg:text-base font-medium text-gray-700 mb-3 lg:mb-4">Imagens do Técnico</h4>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-5 md:p-6 text-center hover:border-gray-400 active:border-gray-500 transition-colors touch-manipulation">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="image-upload-edit"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload-edit" className="cursor-pointer block min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                  <div className="space-y-2">
                    <div className="text-3xl sm:text-4xl">📷</div>
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">Imagens do técnico (laudo)</p>
                    <p className="text-xs text-gray-500 px-2">PNG, JPG até 5MB cada • Máximo 10 imagens</p>
                    {imagensTecnicoNovas.length > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        {imagensTecnicoNovas.length} imagem{imagensTecnicoNovas.length !== 1 ? 'ns' : ''} selecionada{imagensTecnicoNovas.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Preview das novas imagens do técnico */}
              {previewImagensTecnico.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Novas Imagens do Técnico</h4>
                    <button
                      onClick={() => {
                        setImagensTecnicoNovas([]);
                        setPreviewImagensTecnico([]);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Limpar todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {previewImagensTecnico.map((preview, index) => (
                      <div key={index} className="relative group cursor-pointer">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEditorImagem(preview, index, true, false);
                              }}
                              className="bg-purple-600 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg min-h-[40px] touch-manipulation"
                            >
                              <FiEdit3 size={16} />
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(index);
                              }}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 active:bg-red-700 transition-colors shadow-lg min-h-[40px] touch-manipulation"
                            >
                              <FiTrash2 size={16} />
                              Remover
                          </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagens de Entrada (Atendente) */}
              {imagensEntradaExistentes.length > 0 && (
                <div id="anexos" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Imagens de Entrada (Atendente)</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {imagensEntradaExistentes.map((url, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setPreviewImagemUrl(url)}
                        className="relative group cursor-zoom-in touch-manipulation"
                      >
                        <img
                          src={url}
                          alt={`Imagem entrada ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagens do Técnico (Laudo) */}
              {imagensTecnicoExistentes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Imagens do Técnico (Laudo)</h4>
                    <button
                      onClick={() => setImagensTecnicoExistentes([])}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Remover todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    {imagensTecnicoExistentes.map((url, index) => (
                      <div
                        key={index}
                        className="relative group cursor-zoom-in touch-manipulation"
                        onClick={() => setPreviewImagemUrl(url)}
                      >
                        <img
                          src={url}
                          alt={`Imagem técnico ${index + 1}`}
                          className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirEditorImagem(url, index, false, true);
                              }}
                              className="bg-purple-600 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-lg min-h-[40px] touch-manipulation"
                            >
                              <FiEdit3 size={16} />
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveExistingImage(index);
                              }}
                              className="bg-red-500 text-white rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-1.5 hover:bg-red-600 active:bg-red-700 transition-colors shadow-lg min-h-[40px] touch-manipulation"
                            >
                              <FiTrash2 size={16} />
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>


              {/* Checklist de Entrada */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FiCheck className="w-4 h-4 text-green-600" />
                  Checklist de Entrada
                </h4>
            
            {checklistItens.length > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <DynamicChecklist
                  value={checklistData || {}}
                  onChange={setChecklistData}
                  disabled={false}
                  equipamentoCategoria={os?.equipamento as string || undefined}
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">
                Nenhum item de checklist configurado para esta empresa.
              </div>
            )}
          </div>
            </div>
          </CollapsibleSection>

          {/* Modal de visualização de imagem (anexos) */}
          {previewImagemUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setPreviewImagemUrl(null)}
            >
              <div
                className="relative max-w-4xl w-full px-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreviewImagemUrl(null)}
                  className="absolute -top-3 -right-3 bg-black/80 text-white rounded-full p-1.5 shadow-lg hover:bg-black transition-colors"
                >
                  <FiX size={18} />
                </button>
                <div className="bg-black rounded-xl overflow-hidden shadow-2xl max-h-[80vh] flex items-center justify-center">
                  <img
                    src={previewImagemUrl}
                    alt="Visualização do anexo"
                    className="w-full h-full max-h-[80vh] object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botões de Ação - Mobile Fixed, Desktop Normal */}
          <div className="fixed lg:relative bottom-0 left-0 right-0 lg:right-auto bg-white border-t lg:border-t-0 lg:border border-gray-200 p-3 sm:p-4 lg:p-0 shadow-lg lg:shadow-none z-40 safe-area-inset-bottom w-full max-w-full lg:max-w-none overflow-x-hidden lg:mt-6">
            <div className="space-y-2 sm:space-y-3 lg:space-y-4 w-full max-w-full lg:max-w-none lg:flex lg:gap-4">
              {mostrarBotaoIniciar && (
                <Button
                  onClick={handleIniciarOS}
                  disabled={salvando}
                  className="w-full lg:w-auto lg:flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-4 lg:py-3 rounded-xl lg:rounded-lg shadow-lg min-h-[52px] lg:min-h-[44px] touch-manipulation text-base"
                >
                  <FiPlayCircle size={20} className="mr-2" /> 
                  {salvando ? 'Iniciando...' : 'Iniciar OS'}
                </Button>
              )}
              
              <Button
                onClick={handleSalvar}
                disabled={salvando}
                className="w-full lg:w-auto lg:flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 lg:py-3 rounded-xl lg:rounded-lg shadow-lg min-h-[52px] lg:min-h-[44px] touch-manipulation text-base"
              >
                <FiSave size={20} className="mr-2" /> 
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor de Imagem */}
      {editingImageUrl && (
        <ImageEditor
          isOpen={!!editingImageUrl}
          onClose={() => {
            setEditingImageUrl(null);
            setEditingImageIndex(null);
            setEditingNewImage(false);
            setEditingExistingImage(false);
          }}
          imageUrl={editingImageUrl}
          onSave={salvarImagemEditada}
          osId={id}
        />
      )}
      </MenuLayout>
    
  );
}