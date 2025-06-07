'use client'

import MenuLayout from '@/components/MenuLayout';

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
