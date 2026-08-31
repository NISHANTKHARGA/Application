'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Calendar, Clock, Video, Check, X, Home, MessageSquare, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function LawyerAppointmentsPage() {
  const { user, isAuthenticated, isLoading, logout, role } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);

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
      fetchAppointments();
    }
  }, [user, role]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointment/lawyer/me');
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    }
    setLoading(false);
  };

  const updateStatus = async (appointmentId, status) => {
    setActionLoading(appointmentId);
    try {
      await api.put(`/appointment/${appointmentId}/status`, { status });
      toast.success(`Appointment ${status}`);
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to update status');
    }
    setActionLoading(null);
  };

  const handleReschedule = async () => {
    if (!rescheduleModal) return;
    setActionLoading(rescheduleModal.id);
    try {
      const allSuggestions = [];
      if (selectedSlots.length > 0) {
        allSuggestions.push(...selectedSlots.map(s => `${s.date} at ${s.time}`));
      }
      if (rescheduleNotes.trim()) {
        allSuggestions.push(rescheduleNotes.trim());
      }
      const notes = allSuggestions.length > 0 ? allSuggestions.join('\n') : undefined;
      await api.put(`/appointment/${rescheduleModal.id}/reschedule`, { notes });
      toast.success('Reschedule request sent to user');
      setRescheduleModal(null);
      setRescheduleNotes('');
      setRescheduleDate('');
      setSelectedSlots([]);
      setBookedSlots([]);
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to request reschedule');
    }
    setActionLoading(null);
  };

  const fetchBookedSlots = async (date) => {
    if (!rescheduleModal || !date) return;
    setLoadingSlots(true);
    try {
      const response = await api.get(`/appointment/booked-slots/${rescheduleModal.lawyerId}/${date}`);
      setBookedSlots(response.data.bookedSlots || []);
    } catch (error) {
      setBookedSlots([]);
    }
    setLoadingSlots(false);
  };

  const generateTimeSlots = () => {
    const duration = rescheduleModal?.duration || 30;
    const slots = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += duration) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const booked = bookedSlots.includes(time);
        const alreadySelected = selectedSlots.some(s => s.date === rescheduleDate && s.time === time);
        slots.push({ time, booked, alreadySelected });
      }
    }
    return slots;
  };

  const toggleSlot = (time) => {
    if (!rescheduleDate) return;
    const exists = selectedSlots.find(s => s.date === rescheduleDate && s.time === time);
    if (exists) {
      setSelectedSlots(prev => prev.filter(s => !(s.date === rescheduleDate && s.time === time)));
    } else {
      setSelectedSlots(prev => [...prev, { date: rescheduleDate, time }]);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return new Date(apt.dateTime) >= new Date() && !['cancelled', 'completed', 'expired'].includes(apt.status);
    }
    return apt.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'badge-rejected';
      case 'expired': return 'bg-gray-100 text-gray-600';
      case 'reschedule_requested': return 'bg-amber-100 text-amber-800';
      case 'reschedule_pending': return 'bg-purple-100 text-purple-800';
      case 'completion_pending': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 animate-pulse';
      default: return 'badge-pending';
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
    { icon: Home, label: 'Dashboard', href: '/lawyer/dashboard' },
    { icon: MessageSquare, label: 'AI Chat', href: '/chat' },
    { icon: Calendar, label: 'Appointments', href: '/lawyer/appointments' },
    { icon: User, label: 'Profile', href: '/lawyer/profile' },
  ];

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
            <button onClick={logout} className="text-gray-600 hover:text-red-500">
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
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-secondary">My Appointments</h1>
              <p className="text-gray-600">Manage your client consultations</p>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {['all', 'upcoming', 'pending', 'confirmed', 'ongoing', 'completion_pending', 'completed', 'cancelled', 'reschedule_requested', 'reschedule_pending'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="bg-white rounded-xl p-16 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No appointments found</h3>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-lg font-bold">
                          {apt.user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{apt.user?.name}</h3>
                            <p className="text-gray-500">{apt.user?.email}</p>
                            {apt.user?.phone && (
                              <p className="text-sm text-gray-500">{apt.user.phone}</p>
                            )}
                          </div>
                          <span className={`badge ${getStatusBadge(apt.status)}`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(apt.dateTime).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(apt.dateTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            {apt.duration} minutes
                          </div>
                        </div>
                        {apt.notes && (
                          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            <strong>Notes:</strong> {apt.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                          {apt.status === 'pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(apt.id, 'confirmed')}
                                disabled={actionLoading === apt.id}
                                className="btn-primary !py-2 !px-4 flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Accept
                              </button>
                              <button
                                onClick={() => setRescheduleModal(apt)}
                                disabled={actionLoading === apt.id}
                                className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <Calendar className="w-4 h-4" />
                                Reschedule
                              </button>
                              <button
                                onClick={() => updateStatus(apt.id, 'cancelled')}
                                disabled={actionLoading === apt.id}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Cancel
                              </button>
                            </>
                          )}
                          {apt.status === 'reschedule_pending' && (
                            <div className="flex flex-col gap-2">
                              <div className="bg-purple-50 p-3 rounded-lg text-sm">
                                <p className="font-medium text-purple-800">Proposed new time:</p>
                                <p className="text-purple-600">
                                  {new Date(apt.dateTime).toLocaleDateString('en-US', {
                                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                  })}
                                  {' at '}
                                  {new Date(apt.dateTime).toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => updateStatus(apt.id, 'confirmed')}
                                disabled={actionLoading === apt.id}
                                className="btn-primary !py-2 !px-4 flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                                Confirm New Time
                              </button>
                              <button
                                onClick={() => updateStatus(apt.id, 'pending')}
                                disabled={actionLoading === apt.id}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-1 disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Reject & Keep Original
                              </button>
                            </div>
                          )}
                          {apt.meetingLink && !['cancelled', 'pending', 'expired'].includes(apt.status) && (
                            <a
                              href={apt.status === 'confirmed' ? undefined : `/video/${apt.id}`}
                              onClick={apt.status === 'confirmed' ? (e) => {
                                e.preventDefault();
                                api.put(`/appointment/${apt.id}/status`, { status: 'ongoing' }).then(() => {
                                  window.open(`/video/${apt.id}`, '_blank');
                                  fetchAppointments();
                                });
                              } : undefined}
                              target={apt.status !== 'confirmed' ? '_blank' : undefined}
                              rel="noopener noreferrer"
                              className="btn-outline !py-2 !px-4 flex items-center justify-center gap-1"
                            >
                              <Video className="w-4 h-4" />
                              Join Meeting
                            </a>
                          )}
                           {['confirmed', 'ongoing'].includes(apt.status) && (
                            <button
                              onClick={() => updateStatus(apt.id, 'completed')}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-1"
                            >
                              Mark Meeting Complete
                            </button>
                          )}
                          {apt.status === 'completion_pending' && apt.lawyerConfirmedComplete && !apt.userConfirmedComplete && (
                            <div className="bg-blue-50 p-3 rounded-lg text-center">
                              <p className="text-sm text-blue-700 font-medium">Waiting for user to confirm</p>
                            </div>
                          )}
                          {apt.status === 'completion_pending' && !apt.lawyerConfirmedComplete && (
                            <button
                              onClick={() => updateStatus(apt.id, 'completed')}
                              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-1"
                            >
                              Confirm Complete
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Request Reschedule</h3>
              <p className="text-gray-600 text-sm">
                Pick a date to see available slots ({rescheduleModal.duration || 30} min each). Click a slot to suggest it to {rescheduleModal.user?.name}.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pick a Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  fetchBookedSlots(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
              />
            </div>

            {rescheduleDate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-500">Loading slots...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {generateTimeSlots().map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => !slot.booked && toggleSlot(slot.time)}
                        disabled={slot.booked}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          slot.booked
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                            : slot.alreadySelected
                              ? 'bg-primary text-white ring-2 ring-primary/30'
                              : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlots.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Selected Slots</label>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                      {s.date} {s.time}
                      <button onClick={() => setSelectedSlots(prev => prev.filter((_, j) => j !== i))} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (optional)</label>
              <textarea
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Any other message for the user..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleReschedule}
                disabled={actionLoading === rescheduleModal.id || (selectedSlots.length === 0 && !rescheduleNotes.trim())}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {actionLoading === rescheduleModal.id ? 'Sending...' : 'Send Request'}
              </button>
              <button
                onClick={() => { setRescheduleModal(null); setRescheduleNotes(''); setRescheduleDate(''); setSelectedSlots([]); setBookedSlots([]); }}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
        </main>
      </div>
    </div>
  );
}
