'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabaseClient";
import ClienteForm from '../../../../../components/ClienteForm';

export default function EditarClientePage() {
  const params = useParams();
  const [cliente, setCliente] = useState<any>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', params.id)
        .single();
      setCliente(data);
    };
    fetchCliente();
  }, [params.id]);

  if (!cliente) return <p>Carregando...</p>;

  return <ClienteForm cliente={cliente} />;
}