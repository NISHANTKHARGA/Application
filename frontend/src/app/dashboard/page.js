'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ChevronRight, Clock, FileText, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import UserNav from '@/components/UserNav';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ appointments: 0, lawyersViewed: 0 });
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get(`/appointment/user/${user.id}`);
      setAppointments(response.data.appointments || []);
      setStats({ ...stats, appointments: response.data.count || 0 });
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoadingAppointments(false);
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
    <UserNav>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Welcome back, {user?.name}!</h1>
        <p className="text-gray-600">Here's an overview of your legal journey</p>
      </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.appointments}</p>
                    <p className="text-sm text-gray-500">Appointments</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length}
                    </p>
                    <p className="text-sm text-gray-500">Upcoming</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">24/7</p>
                    <p className="text-sm text-gray-500">AI Support</p>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {appointments.filter(a => a.status === 'completed').length}
                    </p>
                    <p className="text-sm text-gray-500">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Quick Actions</h2>
                </div>
                <div className="space-y-4">
                  <Link
                    href="/chat"
                    className="flex items-center justify-between p-4 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Chat with AI Assistant</p>
                        <p className="text-sm text-gray-500">Get legal guidance</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                  <Link
                    href="/lawyers"
                    className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">Find a Lawyer</p>
                        <p className="text-sm text-gray-500">Browse verified lawyers</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                  <Link
                    href="/appointments"
                    className="flex items-center justify-between p-4 bg-accent/10 rounded-xl hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">My Appointments</p>
                        <p className="text-sm text-gray-500">View & manage bookings</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Recent Appointments</h2>
                  <Link href="/appointments" className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </div>
                {loadingAppointments ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-100 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No appointments yet</p>
                    <Link href="/lawyers" className="text-primary hover:underline text-sm">
                      Book your first consultation
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-medium">{apt.lawyer?.name}</p>
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
                        <span className={`badge ${
                          apt.status === 'confirmed' ? 'badge-approved' :
                          apt.status === 'pending' ? 'badge-pending' :
                          apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'badge-rejected'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
    </UserNav>
  );
}
