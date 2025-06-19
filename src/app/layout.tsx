import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ClientWrapper } from '@/components/ClientWrapper';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning={true}>
        <ClientWrapper>
          {children}
          <ToastContainer 
            position="bottom-right" 
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            pauseOnHover
            draggable
            theme="light"
          />
        </ClientWrapper>
      </body>
    </html>
  );
}