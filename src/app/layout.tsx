import type { Metadata } from 'next';
import RootLayoutClient from './RootLayoutClient';

export const metadata: Metadata = {
  title: 'Gestão Consert',
  description: 'Sistema de gestão para assistência técnica',
  icons: {
    icon: '/assets/imagens/icon.png',
  },
  other: {
    'apple-itunes-app': 'app-id=6759183136',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <RootLayoutClient>{children}</RootLayoutClient>;
}
