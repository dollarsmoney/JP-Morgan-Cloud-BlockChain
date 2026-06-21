import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { AuthProvider } from '@/components/auth-provider';

export const metadata: Metadata = {
  title: 'BlockChain Fintech Platform',
  description: 'Send blockchain transactions, manage wallets, and track activity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
