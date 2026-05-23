import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'KanoonSathi - Admin Panel',
  description: 'KanoonSathi Admin Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1E293B',
                color: '#fff',
                borderRadius: '12px',
              },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
