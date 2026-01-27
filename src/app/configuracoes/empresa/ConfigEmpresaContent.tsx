'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import { 
  BuildingOfficeIcon as FiBuilding,
  PhotoIcon as FiImage,
  ArrowUpTrayIcon as FiUpload,
  XMarkIcon as FiX,
  TrashIcon as FiTrash2,
  DocumentTextIcon as FiFileText,
  PencilIcon as FiEdit,
  PencilIcon as FiEdit2,
  CheckIcon as FiCheck,
  CheckIcon as FiSave,
  MapPinIcon as FiMapPin,
  PhoneIcon as FiPhone,
  EnvelopeIcon as FiMail,
  GlobeAltIcon as FiGlobe
} from '@heroicons/react/24/outline';

interface SupabaseError { message: string }

interface EmpresaData {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  website: string;
  logo_url?: string;
  logo_claro_url?: string;
  logo_escuro_url?: string;
  created_at: string;
  updated_at: string;
}

export default function ConfigEmpresaContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const { podeAcessar } = useConfigPermission('empresa');
  
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logoClaroFile, setLogoClaroFile] = useState<File | null>(null);
  const [logoClaroPreview, setLogoClaroPreview] = useState<string | null>(null);
  const [logoEscuroFile, setLogoEscuroFile] = useState<File | null>(null);
  const [logoEscuroPreview, setLogoEscuroPreview] = useState<string | null>(null);
  const [uploadingLogoClaro, setUploadingLogoClaro] = useState(false);
  const [uploadingLogoEscuro, setUploadingLogoEscuro] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    website: ''
  });

  const fetchEmpresa = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Primeiro buscar o usuário para obter o empresa_id
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw userError;
      }

      if (!userData?.empresa_id) {
        console.log('Usuário não tem empresa_id associado');
        setLoading(false);
        return;
      }

      // Agora buscar a empresa usando o empresa_id
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', userData.empresa_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setEmpresa(data);
        setFormData({
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          endereco: data.endereco || '',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || ''
        });
      }
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      addToast('error', 'Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresa();
  }, [user?.id]);

  // Se não tem permissão, mostrar mensagem
  if (!podeAcessar) {
    return <AcessoNegadoComponent />;
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const makeHandleLogoChange = (tipo: 'claro' | 'escuro') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('error', 'Arquivo muito grande. Máximo 5MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        addToast('error', 'Apenas arquivos de imagem são permitidos.');
        return;
      }

      if (tipo === 'claro') {
        setLogoClaroFile(file);
      } else {
        setLogoEscuroFile(file);
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (tipo === 'claro') {
          setLogoClaroPreview(e.target?.result as string);
        } else {
          setLogoEscuroPreview(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (file: File, setUploading: (v: boolean) => void): Promise<string | null> => {
    if (!file || !user?.id) return null;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      addToast('error', 'Erro ao fazer upload do logo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async (tipo: 'claro' | 'escuro') => {
    const campo = tipo === 'claro' ? 'logo_claro_url' : 'logo_escuro_url';
    const temLogo =
      tipo === 'claro' ? empresa?.logo_claro_url : empresa?.logo_escuro_url;
    if (!empresa?.id || !temLogo) return;

    const confirmed = await confirm({
      title: `Remover Logo ${tipo === 'claro' ? 'claro' : 'escuro'}`,
      message: 'Tem certeza que deseja remover este logo?'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('empresas')
        .update({ [campo]: null })
        .eq('id', empresa.id);

      if (error) throw error as SupabaseError;

      setEmpresa(prev =>
        prev
          ? {
              ...prev,
              [campo]: undefined
            }
          : null
      );
      addToast('success', 'Logo removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      addToast('error', 'Erro ao remover logo');
    }
  };

  const saveEmpresa = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Primeiro buscar o usuário para obter o empresa_id
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) {
        console.error('Erro ao buscar usuário:', userError);
        throw userError;
      }

      let logoClaroUrl = empresa?.logo_claro_url;
      let logoEscuroUrl = empresa?.logo_escuro_url;

      if (logoClaroFile) {
        logoClaroUrl = await uploadLogo(logoClaroFile, setUploadingLogoClaro);
        if (!logoClaroUrl) {
          setLoading(false);
          return;
        }
      }

      if (logoEscuroFile) {
        logoEscuroUrl = await uploadLogo(logoEscuroFile, setUploadingLogoEscuro);
        if (!logoEscuroUrl) {
          setLoading(false);
          return;
        }
      }

      // Manter compatibilidade com campos antigos:
      // logo_url padrão passa a usar o logo escuro (para fundos claros), se existir;
      // senão usa o claro; se nenhum foi enviado, mantém o valor atual.
      let logoUrl = empresa?.logo_url;
      if (logoEscuroUrl || logoClaroUrl) {
        logoUrl = logoEscuroUrl || logoClaroUrl || logoUrl;
      }

      const empresaData = {
        ...formData,
        logo_url: logoUrl,
        logo_claro_url: logoClaroUrl,
        logo_escuro_url: logoEscuroUrl
      };

      if (empresa) {
        const { error } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', empresa.id);

        if (error) throw error;
      } else if (userData?.empresa_id) {
        // Se não existe empresa mas o usuário tem empresa_id, criar nova
        const { data, error } = await supabase
          .from('empresas')
          .insert([{ ...empresaData, id: userData.empresa_id }])
          .select()
          .single();

        if (error) throw error;
        setEmpresa(data);
      } else {
        throw new Error('Usuário não tem empresa_id associado');
      }

      setEditMode(false);
      setLogoClaroFile(null);
      setLogoClaroPreview(null);
      setLogoEscuroFile(null);
      setLogoEscuroPreview(null);
      addToast('success', 'Dados da empresa salvos com sucesso!');
      
      // Forçar atualização do estado da empresa com o novo logo
      setEmpresa(prev =>
        prev
          ? {
              ...prev,
              logo_url: logoUrl,
              logo_claro_url: logoClaroUrl,
              logo_escuro_url: logoEscuroUrl
            }
          : null
      );
      
      await fetchEmpresa();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      addToast('error', 'Erro ao salvar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setLogoClaroFile(null);
    setLogoClaroPreview(null);
    setLogoEscuroFile(null);
    setLogoEscuroPreview(null);
    if (empresa) {
      setFormData({
        nome: empresa.nome || '',
        cnpj: empresa.cnpj || '',
        endereco: empresa.endereco || '',
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        website: empresa.website || ''
      });
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiBuilding className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Configurações da Empresa</h1>
                <p className="text-gray-600">Gerencie as informações da sua empresa</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FiImage className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Logos da Empresa</h2>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Configure versões de logo para fundos claros e escuros. O sistema usa o logo escuro em fundos claros e o logo claro em fundos escuros.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo escuro (para fundos claros) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    Logo escuro (para fundos claros)
                  </h3>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white relative overflow-hidden">
                        {logoEscuroPreview || empresa?.logo_escuro_url ? (
                          <>
                            <img
                              src={logoEscuroPreview || empresa?.logo_escuro_url || ''}
                              alt="Logo escuro da empresa"
                              className="w-full h-full object-contain"
                              key={logoEscuroPreview || empresa?.logo_escuro_url}
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                setTimeout(() => {
                                  img.src = img.src + '?t=' + Date.now();
                                }, 1000);
                              }}
                            />
                            {editMode && (
                              <button
                                onClick={() => {
                                  setLogoEscuroFile(null);
                                  setLogoEscuroPreview(null);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Sem logo escuro</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      {editMode && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Selecionar logo escuro
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={makeHandleLogoChange('escuro')}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                            </p>
                          </div>

                          {empresa?.logo_escuro_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLogo('escuro')}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <FiTrash2 className="w-4 h-4 mr-2" />
                              Remover logo escuro atual
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo claro (para fundos escuros) */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    Logo claro (para fundos escuros)
                  </h3>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-900 relative overflow-hidden">
                        {logoClaroPreview || empresa?.logo_claro_url ? (
                          <>
                            <img
                              src={logoClaroPreview || empresa?.logo_claro_url || ''}
                              alt="Logo claro da empresa"
                              className="w-full h-full object-contain"
                              key={logoClaroPreview || empresa?.logo_claro_url}
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                setTimeout(() => {
                                  img.src = img.src + '?t=' + Date.now();
                                }, 1000);
                              }}
                            />
                            {editMode && (
                              <button
                                onClick={() => {
                                  setLogoClaroFile(null);
                                  setLogoClaroPreview(null);
                                }}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <FiX className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <FiImage className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Sem logo claro</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      {editMode && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Selecionar logo claro
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={makeHandleLogoChange('claro')}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                            </p>
                          </div>

                          {empresa?.logo_claro_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeLogo('claro')}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <FiTrash2 className="w-4 h-4 mr-2" />
                              Remover logo claro atual
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FiFileText className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Informações da Empresa</h2>
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveEmpresa}
                        disabled={loading || uploadingLogoClaro || uploadingLogoEscuro}
                      >
                        <FiSave className="w-4 h-4 mr-2" />
                        {loading || uploadingLogoClaro || uploadingLogoEscuro ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <FiEdit2 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa
                  </label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Digite o nome da empresa"
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNPJ
                  </label>
                  <Input
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    disabled={!editMode}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMapPin className="w-4 h-4 inline mr-1" />
                    Endereço
                  </label>
                  <Input
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    placeholder="Digite o endereço completo"
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiPhone className="w-4 h-4 inline mr-1" />
                    Telefone
                  </label>
                  <Input
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    disabled={!editMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiMail className="w-4 h-4 inline mr-1" />
                    E-mail
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    disabled={!editMode}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FiGlobe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://www.empresa.com"
                    disabled={!editMode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}