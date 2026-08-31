'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Scale, Video, PhoneOff, ArrowLeft, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function VideoConsultationPage() {
  const params = useParams();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [meetingOpened, setMeetingOpened] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (params.id && user) {
      fetchAppointment();
    }
  }, [params.id, user]);

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/appointment/${params.id}`);
      setAppointment(response.data.appointment);
    } catch (error) {
      console.error('Failed to fetch appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appointment && ['pending', 'expired'].includes(appointment.status)) {
      toast.error(appointment.status === 'expired' ? 'This meeting has expired.' : 'Meeting not available yet. Wait for lawyer to accept.');
      router.push(role === 'lawyer' ? '/lawyer/appointments' : '/appointments');
    }
  }, [appointment, role, router]);

  const copyMeetingLink = () => {
    if (appointment?.meetingLink) {
      navigator.clipboard.writeText(appointment.meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const joinMeeting = () => {
    if (appointment?.meetingLink) {
      window.open(appointment.meetingLink, '_blank');
      setMeetingOpened(true);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Loading consultation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-white">KanoonSathi</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {appointment && (
              <div className="text-right">
                <p className="text-white font-medium">
                  {role === 'lawyer' ? appointment.user?.name : appointment.lawyer?.name}
                </p>
                <p className="text-gray-400 text-sm">
                  {appointment.lawyer?.specialization} Consultation
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {!meetingOpened ? (
            <>
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready to Join?</h2>
              <p className="text-gray-400 mb-8">
                Click the button below to open the video meeting in a new tab. You can freely navigate the app while the meeting stays open.
              </p>
              <button
                onClick={joinMeeting}
                className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-3 mx-auto"
              >
                <Video className="w-6 h-6" />
                Join Video Meeting
              </button>
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Meeting is Open</h2>
              <p className="text-gray-400 mb-4">
                The video meeting is running in a separate tab. You can safely navigate the app — the meeting will stay active.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                Need to rejoin? Click the button below.
              </p>
              <button
                onClick={joinMeeting}
                className="bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <Video className="w-5 h-5" />
                Reopen Meeting Tab
              </button>
            </>
          )}

          {appointment && (
            <div className="mt-10 bg-gray-800 rounded-xl p-6 text-left max-w-md mx-auto">
              <h3 className="text-white font-semibold mb-4">Appointment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {new Date(appointment.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time</span>
                  <span className="text-white">
                    {new Date(appointment.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{appointment.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    appointment.status === 'ongoing' ? 'bg-blue-500 text-white animate-pulse' :
                    appointment.status === 'confirmed' ? 'bg-green-500 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {appointment.status === 'ongoing' ? '● Ongoing' : appointment.status}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Meeting Link</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-xs truncate flex-1">{appointment.meetingLink}</p>
                    <button onClick={copyMeetingLink} className="text-primary hover:text-primary-600">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <Link
              href={role === 'lawyer' ? '/lawyer/appointments' : '/appointments'}
              className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Appointments
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
