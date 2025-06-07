import MenuLayout from '@/components/MenuLayout';

export const metadata = {
  title: 'Dashboard',
  description: 'Área logada do sistema',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MenuLayout>
      {children}
    </MenuLayout>
  );
}
