import { AuthProvider } from "@/context/AuthContext";
import './globals.css';

export const metadata = {
  title: "AgilizaOS",
  description: "Sistema de ordem de serviço",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
