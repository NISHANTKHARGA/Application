'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Video, ChevronRight, X, Check, XCircle, Star } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

export default function AppointmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(null);
  const [rescheduleRespondModal, setRescheduleRespondModal] = useState(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleNewTime, setRescheduleNewTime] = useState('');
  const [rateModal, setRateModal] = useState(null);
  const [rateValue, setRateValue] = useState(0);
  const [rateHover, setRateHover] = useState(0);
  const [rateReview, setRateReview] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

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
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      await api.put(`/appointment/${appointmentId}/cancel`);
      toast.success('Appointment cancelled');
      fetchAppointments();
      setCancelModal(null);
    } catch (error) {
      toast.error('Failed to cancel appointment');
    }
  };

  const handleRescheduleRespond = async () => {
    if (!rescheduleRespondModal || !rescheduleNewDate || !rescheduleNewTime) return;
    try {
      const dateTime = new Date(`${rescheduleNewDate}T${rescheduleNewTime}`).toISOString();
      await api.put(`/appointment/${rescheduleRespondModal.id}/respond-reschedule`, { dateTime });
      toast.success('Reschedule confirmed');
      setRescheduleRespondModal(null);
      setRescheduleNewDate('');
      setRescheduleNewTime('');
      fetchAppointments();
    } catch (error) {
      toast.error('Failed to respond to reschedule');
    }
  };

  const handleRate = async () => {
    if (!rateModal || !rateValue) return;
    setRatingSubmitting(true);
    try {
      await api.put(`/appointment/${rateModal.id}/rate`, {
        rating: rateValue,
        review: rateReview.trim() || undefined
      });
      toast.success('Rating submitted!');
      setRateModal(null);
      setRateValue(0);
      setRateHover(0);
      setRateReview('');
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'badge-rejected';
      case 'reschedule_requested': return 'bg-amber-100 text-amber-800';
      case 'reschedule_pending': return 'bg-purple-100 text-purple-800';
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

  const upcomingAppointments = appointments.filter(a => 
    new Date(a.dateTime) >= new Date() && !['cancelled', 'completed'].includes(a.status)
  );
  const pastAppointments = appointments.filter(a => 
    new Date(a.dateTime) < new Date() || ['cancelled', 'completed'].includes(a.status)
  );

  return (
    <UserNav>
      <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-secondary">My Appointments</h1>
              <p className="text-gray-600">Manage your legal consultations</p>
            </div>
            <Link href="/lawyers" className="btn-primary">
              Book New Appointment
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="h-24 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No appointments yet</h3>
              <p className="text-gray-500 mb-6">Book your first consultation with a lawyer</p>
              <Link href="/lawyers" className="btn-primary">
                Find a Lawyer
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingAppointments.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
                  <div className="space-y-4">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.id} className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary-800 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg font-bold">
                              {apt.lawyer?.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{apt.lawyer?.name}</h3>
                                <p className="text-primary text-sm">{apt.lawyer?.specialization}</p>
                              </div>
                              <span className={`badge ${getStatusColor(apt.status)}`}>
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
                          </div>
                          <div className="flex gap-2">
                            {apt.meetingLink && apt.status !== 'cancelled' && (
                              <a
                                href={`/video/${apt.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary !py-2 !px-4 flex items-center gap-1"
                              >
                                <Video className="w-4 h-4" />
                                Join Meeting
                              </a>
                            )}
                            {apt.status === 'pending' && (
                              <button
                                onClick={() => setCancelModal(apt)}
                                className="btn-outline !py-2 !px-4 text-red-500 border-red-500 hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )}
                            {apt.status === 'reschedule_requested' && (
                              <button
                                onClick={() => { setRescheduleRespondModal(apt); setRescheduleNewDate(''); setRescheduleNewTime(''); }}
                                className="btn-primary !py-2 !px-4"
                              >
                                Respond to Reschedule
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastAppointments.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">Past Appointments</h2>
                  <div className="space-y-4">
                    {pastAppointments.map((apt) => (
                      <div key={apt.id} className="bg-white rounded-xl p-6 shadow-sm opacity-75">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-lg font-bold">
                              {apt.lawyer?.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">{apt.lawyer?.name}</h3>
                                <p className="text-gray-500 text-sm">{apt.lawyer?.specialization}</p>
                              </div>
                              <span className={`badge ${getStatusColor(apt.status)}`}>
                                {apt.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(apt.dateTime).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {new Date(apt.dateTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                            {apt.userRating ? (
                              <div className="flex items-center gap-2 mt-3">
                                <div className="flex">
                                  {[1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${s <= apt.userRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">Your rating</span>
                              </div>
                            ) : apt.status === 'completed' ? (
                              <button
                                onClick={() => { setRateModal(apt); setRateValue(0); setRateHover(0); setRateReview(''); }}
                                className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors"
                              >
                                <Star className="w-4 h-4" />
                                Rate Lawyer
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cancel Appointment?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your appointment with {cancelModal.lawyer?.name}?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancelModal(null)}
                  className="flex-1 btn-outline"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() => handleCancel(cancelModal.id)}
                  className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rescheduleRespondModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Pick New Date & Time</h3>
            <p className="text-gray-600 mb-4">
              {rescheduleRespondModal.lawyer?.name} requested to reschedule. Pick a new time that works for you.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Date</label>
                <input
                  type="date"
                  value={rescheduleNewDate}
                  onChange={(e) => setRescheduleNewDate(e.target.value)}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Time</label>
                <input
                  type="time"
                  value={rescheduleNewTime}
                  onChange={(e) => setRescheduleNewTime(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRescheduleRespond}
                  disabled={!rescheduleNewDate || !rescheduleNewTime}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setRescheduleRespondModal(null)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Rate Your Consultation</h3>
              <button onClick={() => setRateModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-5">
              How was your experience with <span className="font-semibold">{rateModal.lawyer?.name}</span>?
            </p>
            <div className="flex justify-center gap-1 mb-2">
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  onMouseEnter={() => setRateHover(star)}
                  onMouseLeave={() => setRateHover(0)}
                  onClick={() => setRateValue(star)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star className={`w-9 h-9 transition-colors ${
                    star <= (rateHover || rateValue)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200'
                  }`} />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mb-4 h-5">
              {rateValue === 1 ? 'Poor' : rateValue === 2 ? 'Fair' : rateValue === 3 ? 'Good' : rateValue === 4 ? 'Very Good' : rateValue === 5 ? 'Excellent' : ''}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Review (optional)</label>
              <textarea
                value={rateReview}
                onChange={(e) => setRateReview(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRateModal(null)}
                className="flex-1 btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleRate}
                disabled={!rateValue || ratingSubmitting}
                className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {ratingSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Star className="w-4 h-4" />
                )}
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </UserNav>
  );
}
