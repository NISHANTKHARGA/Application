'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Calendar, Clock, Video, Users, DollarSign, Star, LogOut, Home, MessageSquare, Check, X, Eye } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function LawyerDashboardPage() {
  const { user, isAuthenticated, isLoading, logout, role } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (role !== 'lawyer') {
        router.push('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, role, router]);

  useEffect(() => {
    if (user && role === 'lawyer') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    try {
      const [statsRes, appointmentsRes] = await Promise.all([
        api.get('/lawyer/stats'),
        api.get('/appointment/lawyer/me')
      ]);
      setStats(statsRes.data.stats);
      setAppointments(appointmentsRes.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      await api.put(`/appointment/${appointmentId}/status`, { status });
      toast.success(`Appointment ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading || role !== 'lawyer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/lawyer/dashboard', active: true },
    { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
    { icon: Calendar, label: 'Appointments', href: '/lawyer/appointments' },
  ];

  const upcomingAppointments = appointments.filter(a => 
    new Date(a.dateTime) >= new Date() && !['cancelled', 'completed'].includes(a.status)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Scale className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-secondary">KanoonSathi</span>
              </Link>
              <span className="hidden sm:inline px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                Lawyer Panel
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700 hidden sm:inline">{user?.name}</span>
              </div>
              <button onClick={logout} className="text-gray-600 hover:text-red-500">
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
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-secondary">Lawyer Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.name}!</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalAppointments || 0}</p>
                    <p className="text-sm text-gray-500">Total Appointments</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.pendingAppointments || 0}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.completedAppointments || 0}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{parseFloat(stats?.rating || 0).toFixed(1)}</p>
                    <p className="text-sm text-gray-500">Rating</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
                <span className="text-sm text-gray-500">{upcomingAppointments.length} scheduled</span>
              </div>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming appointments</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {apt.user?.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{apt.user?.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(apt.dateTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apt.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(apt.id, 'confirmed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Accept"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => updateStatus(apt.id, 'cancelled')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Reject"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {apt.meetingLink && (
                          <Link
                            href={`/video/${apt.id}`}
                            className="btn-primary !py-2 !px-4 flex items-center gap-1"
                          >
                            <Video className="w-4 h-4" />
                            Join Meeting
                          </Link>
                        )}
                        {apt.caseSummary && (
                          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="View Case Summary">
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 card">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Link
                  href="/chat"
                  className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <MessageSquare className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">AI Assistant</p>
                    <p className="text-sm text-gray-500">Get help with legal queries</p>
                  </div>
                </Link>
                <Link
                  href="/lawyer/profile"
                  className="flex items-center gap-4 p-4 bg-secondary/5 rounded-xl hover:bg-secondary/10 transition-colors"
                >
                  <Users className="w-8 h-8 text-secondary" />
                  <div>
                    <p className="font-medium">Update Profile</p>
                    <p className="text-sm text-gray-500">Manage your availability</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
