'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAuth } from '@/context/AuthContext';
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
  created_at: string;
  updated_at: string;
}

export default function ConfigEmpresaContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirm = useConfirm();
  
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
        console.log('✅ Empresa encontrada:', data);
        setEmpresa(data);
        setFormData({
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          endereco: data.endereco || '',
          telefone: data.telefone || '',
          email: data.email || '',
          website: data.website || ''
        });
      } else {
        console.log('Nenhuma empresa encontrada para o usuário');
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user?.id) return null;

    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      // Usar crypto.randomUUID() ou timestamp apenas no cliente
      const timestamp = typeof window !== 'undefined' ? Date.now() : Math.floor(Math.random() * 1000000);
      const fileName = `${user.id}-${timestamp}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('empresa-assets')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('empresa-assets')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error);
      addToast('error', 'Erro ao fazer upload do logo');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!empresa?.logo_url) return;

    const confirmed = await confirm({
      title: 'Remover Logo',
      message: 'Tem certeza que deseja remover o logo da empresa?'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('empresas')
        .update({ logo_url: null })
        .eq('id', empresa.id);

      if (error) throw error;

      setEmpresa(prev => prev ? { ...prev, logo_url: undefined } : null);
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

      let logoUrl = empresa?.logo_url;

      if (logoFile) {
        logoUrl = await uploadLogo();
        if (!logoUrl) {
          setLoading(false);
          return;
        }
      }

      const empresaData = {
        ...formData,
        logo_url: logoUrl
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
      setLogoFile(null);
      setLogoPreview(null);
      addToast('success', 'Dados da empresa salvos com sucesso!');
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
    setLogoFile(null);
    setLogoPreview(null);
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
              <div className="flex items-center gap-3 mb-6">
                <FiImage className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Logo da Empresa</h2>
              </div>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative overflow-hidden">
                    {logoPreview || empresa?.logo_url ? (
                      <>
                        <img
                          src={logoPreview || empresa?.logo_url}
                          alt="Logo da empresa"
                          className="w-full h-full object-contain"
                        />
                        {editMode && (
                          <button
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
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
                        <p className="text-sm text-gray-500">Sem logo</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-4">
                    Clique em "Editar" para modificar o logo da empresa
                  </p>

                  {editMode && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selecionar novo logo
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB
                        </p>
                      </div>

                      {empresa?.logo_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={removeLogo}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <FiTrash2 className="w-4 h-4 mr-2" />
                          Remover logo atual
                        </Button>
                      )}
                    </div>
                  )}
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
                        disabled={loading || uploadingLogo}
                      >
                        <FiSave className="w-4 h-4 mr-2" />
                        {loading || uploadingLogo ? 'Salvando...' : 'Salvar'}
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