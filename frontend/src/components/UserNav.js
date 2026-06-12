'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Scale, MessageSquare, Users, Calendar, User, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const userNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
  { icon: Users, label: 'Find Lawyers', href: '/lawyers' },
  { icon: Calendar, label: 'Appointments', href: '/appointments' },
  { icon: User, label: 'Profile', href: '/profile' },
];

const lawyerNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/lawyer/dashboard' },
  { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
];

export default function UserNav({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const navItems = role === 'lawyer' ? lawyerNavItems : userNavItems.filter(item =>
    item.href === '/lawyers' ? role !== 'lawyer' : true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href={role === 'lawyer' ? '/lawyer/dashboard' : '/dashboard'} className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-secondary">KanoonSathi</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700">{user?.name}</span>
              </Link>
              <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-primary" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="hidden md:flex fixed left-0 top-16 bottom-16 w-64 bg-white border-r border-gray-100 z-30">
        <div className="w-full p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-primary'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="pt-16 md:ml-64 pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
