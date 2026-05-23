'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Scale, Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Users, Settings, ArrowLeft, Maximize, Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function VideoConsultationPage() {
  const params = useParams();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

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

  const copyMeetingLink = () => {
    if (appointment?.meetingLink) {
      navigator.clipboard.writeText(appointment.meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInNewTab = () => {
    if (appointment?.meetingLink) {
      window.open(appointment.meetingLink, '_blank');
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
      {/* Header */}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Jitsi iframe */}
          <iframe
            ref={iframeRef}
            src={`${appointment?.meetingLink}?skipMutedParticipants=false&showWatermark=false&showCont召hatOnWelcomePage=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 140px)' }}
          />

          {/* Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-gray-800/90 backdrop-blur-sm rounded-full px-6 py-3">
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`p-3 rounded-full transition-colors ${
                isMicOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white'
              }`}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-3 rounded-full transition-colors ${
                isVideoOn ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500 text-white'
              }`}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-gray-600" />

            <button
              onClick={openInNewTab}
              className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Open in new tab"
            >
              <Maximize className="w-5 h-5" />
            </button>

            <button
              onClick={copyMeetingLink}
              className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              title="Copy meeting link"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>

            <div className="w-px h-8 bg-gray-600" />

            <Link
              href={role === 'lawyer' ? '/lawyer/appointments' : '/appointments'}
              className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Leave meeting"
            >
              <PhoneOff className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 bg-gray-800 border-l border-gray-700 p-4">
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-2">Meeting Info</h3>
            <div className="space-y-2">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Meeting Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm truncate flex-1">{appointment?.meetingLink}</p>
                  <button
                    onClick={copyMeetingLink}
                    className="text-primary hover:text-primary-600"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {appointment && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Appointment Details</h3>
              <div className="bg-gray-700 rounded-lg p-3 space-y-3">
                <div>
                  <p className="text-gray-400 text-xs">Date & Time</p>
                  <p className="text-white text-sm">
                    {new Date(appointment.dateTime).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                    <br />
                    {new Date(appointment.dateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Duration</p>
                  <p className="text-white text-sm">{appointment.duration} minutes</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    appointment.status === 'confirmed' ? 'bg-green-500 text-white' :
                    appointment.status === 'pending' ? 'bg-yellow-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href={role === 'lawyer' ? '/lawyer/appointments' : '/appointments'}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Appointments
            </Link>
          </div>

          <div className="mt-6 p-4 bg-primary/20 rounded-lg">
            <h4 className="text-primary font-medium mb-2">Legal Consultation</h4>
            <p className="text-gray-400 text-xs">
              This consultation is for legal advice only. The lawyer is a verified professional on KanoonSathi platform.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 lg:hidden">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
          <h2 className="text-white text-xl font-bold mb-4">Join Video Consultation</h2>
          <p className="text-gray-400 mb-4">
            Click the button below to join your video consultation. Make sure to allow camera and microphone access.
          </p>
          <button
            onClick={openInNewTab}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Video className="w-5 h-5" />
            Open Video Call
          </button>
          <Link
            href={role === 'lawyer' ? '/lawyer/appointments' : '/appointments'}
            className="block text-center text-gray-400 hover:text-white mt-4"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
