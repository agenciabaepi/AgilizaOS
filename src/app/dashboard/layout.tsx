export const metadata = {
  title: 'Dashboard',
  description: 'Área logada do sistema',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
