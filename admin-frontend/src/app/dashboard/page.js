'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Users, UserCheck, UserX, Calendar, LogOut, Home, CheckCircle, XCircle, FileText, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingLawyers, setPendingLawyers] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      const [statsRes, lawyersRes, appointmentsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/lawyers/pending'),
        api.get('/admin/appointments')
      ]);
      setStats(statsRes.data.stats);
      setPendingLawyers(lawyersRes.data.lawyers || []);
      setRecentAppointments(appointmentsRes.data.appointments?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveLawyer = async (lawyerId) => {
    setActionLoading(lawyerId);
    try {
      await api.put(`/admin/lawyers/approve/${lawyerId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to approve lawyer:', error);
    }
    setActionLoading(null);
  };

  const rejectLawyer = async (lawyerId) => {
    setActionLoading(lawyerId);
    try {
      await api.put(`/admin/lawyers/reject/${lawyerId}`, { reason: 'Application not meeting requirements' });
      fetchData();
    } catch (error) {
      console.error('Failed to reject lawyer:', error);
    }
    setActionLoading(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', active: true },
    { icon: Users, label: 'Lawyers', href: '/lawyers' },
    { icon: UserCheck, label: 'Users', href: '/users' },
    { icon: Calendar, label: 'Appointments', href: '/appointments' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Scale className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-secondary">KanoonSathi</span>
              </Link>
              <span className="hidden sm:inline px-3 py-1 bg-secondary text-white text-sm rounded-full">Admin Panel</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700 hidden sm:inline">Admin</span>
              <button onClick={() => { logout(); router.push('/login'); }} className="text-gray-600 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-100 flex-col">
          <div className="p-6 flex-1">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${item.active ? 'sidebar-link-active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.label === 'Lawyers' && pendingLawyers.length > 0 && (
                    <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {pendingLawyers.length}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-secondary">Admin Dashboard</h1>
              <p className="text-gray-600">Overview of platform activity</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.users?.total || 0}</p>
                    <p className="text-sm text-gray-500">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.lawyers?.total || 0}</p>
                    <p className="text-sm text-gray-500">Approved Lawyers</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <UserX className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.lawyers?.pending || 0}</p>
                    <p className="text-sm text-gray-500">Pending Applications</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.appointments?.total || 0}</p>
                    <p className="text-sm text-gray-500">Total Appointments</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Pending Lawyer Applications</h2>
                  <Link href="/lawyers" className="text-sm text-primary hover:underline">View all</Link>
                </div>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : pendingLawyers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingLawyers.slice(0, 5).map((lawyer) => (
                      <div key={lawyer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">{lawyer.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium">{lawyer.name}</p>
                            <p className="text-sm text-gray-500">{lawyer.specialization} - {lawyer.experience} years exp</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => approveLawyer(lawyer.id)} disabled={actionLoading === lawyer.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Approve">
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button onClick={() => rejectLawyer(lawyer.id)} disabled={actionLoading === lawyer.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Reject">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Recent Appointments</h2>
                  <Link href="/appointments" className="text-sm text-primary hover:underline">View all</Link>
                </div>
                {recentAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No appointments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium">{apt.user?.name}</p>
                          <p className="text-sm text-gray-500">with {apt.lawyer?.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{new Date(apt.dateTime).toLocaleDateString()}</p>
                          <span className={`badge text-xs ${apt.status === 'confirmed' ? 'badge-approved' : apt.status === 'pending' ? 'badge-pending' : apt.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'badge-rejected'}`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 card">
              <h2 className="text-lg font-semibold mb-6">Platform Overview</h2>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <span className="font-semibold">Completion Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">
                    {stats?.appointments?.total > 0 ? Math.round((stats.appointments.completed / stats.appointments.total) * 100) : 0}%
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <span className="font-semibold">Active Lawyers</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{stats?.lawyers?.total || 0}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-6 h-6 text-purple-600" />
                    <span className="font-semibold">Registered Users</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{stats?.users?.total || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
