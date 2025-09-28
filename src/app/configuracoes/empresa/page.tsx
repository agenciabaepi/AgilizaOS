'use client';

import ClientOnlyWrapper from './ClientOnlyWrapper';
import ConfigEmpresaContent from './ConfigEmpresaContent';

export default function ConfigEmpresa() {
  return (
    <ClientOnlyWrapper>
      <ConfigEmpresaContent />
    </ClientOnlyWrapper>
  );
}