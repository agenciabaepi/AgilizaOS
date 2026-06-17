import type { Metadata } from 'next';
import RootLayoutClient from './RootLayoutClient';

export const metadata: Metadata = {
  title: 'Gestão Consert',
  description: 'Sistema de gestão para assistência técnica',
  icons: {
    icon: '/assets/imagens/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}
