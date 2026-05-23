'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Search, LogOut, Home, Users, Calendar, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function AdminAppointmentsPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchAppointments();
  }, [isAuthenticated]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/admin/appointments');
      setAppointments(response.data.appointments || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      apt.lawyer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Lawyers', href: '/lawyers' },
    { icon: UserCheck, label: 'Users', href: '/users' },
    { icon: Calendar, label: 'Appointments', href: '/appointments', active: true },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            </div>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-gray-600 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-100 flex-col">
          <div className="p-6 flex-1">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`sidebar-link ${item.active ? 'sidebar-link-active' : ''}`}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-secondary">Appointment Management</h1>
              <p className="text-gray-600">View and manage all appointments</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-2xl font-bold">{stats.total || 0}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
                <p className="text-sm text-yellow-600">Pending</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">{stats.confirmed || 0}</p>
                <p className="text-sm text-green-600">Confirmed</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">{stats.completed || 0}</p>
                <p className="text-sm text-blue-600">Completed</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-2xl font-bold text-red-600">{stats.cancelled || 0}</p>
                <p className="text-sm text-red-600">Cancelled</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search by user or lawyer name..." value={search}
                    onChange={(e) => setSearch(e.target.value)} className="input-field pl-12" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <button key={status} onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${statusFilter === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />))}
                </div>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-16 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No appointments found</h3>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Client</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Lawyer</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date & Time</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Duration</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Meeting</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredAppointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-semibold">
                                  {apt.user?.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{apt.user?.name}</p>
                                <p className="text-xs text-gray-500">{apt.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-medium">{apt.lawyer?.name}</p>
                            <p className="text-xs text-primary">{apt.lawyer?.specialization}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p>{new Date(apt.dateTime).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(apt.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`badge ${getStatusBadge(apt.status)}`}>{apt.status}</span>
                          </td>
                          <td className="px-6 py-4"><span className="text-gray-600">{apt.duration} min</span></td>
                          <td className="px-6 py-4 text-right">
                            {apt.meetingLink && (
                              <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:underline text-sm">Join Link</a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
