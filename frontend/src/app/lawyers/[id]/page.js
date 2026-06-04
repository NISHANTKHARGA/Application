'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, Clock, Video, Star, ArrowLeft, Check, FileText, Upload, X, File, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export default function LawyerBookingPage() {
  const params = useParams();
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(30);
  const [booking, setBooking] = useState(false);
  const [chatFile, setChatFile] = useState(null);
  const [showChatOption, setShowChatOption] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (params.id) {
      fetchLawyer();
    }
  }, [params.id]);

  const fetchLawyer = async () => {
    try {
      const response = await api.get(`/lawyer/${params.id}`);
      setLawyer(response.data.lawyer);
    } catch (error) {
      console.error('Failed to fetch lawyer:', error);
      toast.error('Lawyer not found');
      router.push('/lawyers');
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setChatFile(file);
    }
  };

  const removeFile = () => {
    setChatFile(null);
  };

  const downloadChat = async () => {
    try {
      const response = await api.get(`/chat/download/${user.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kanoonsathi-chat-${Date.now()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Chat downloaded! You can upload it during booking.');
      setShowChatOption(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('No chat history found. Start a conversation first.');
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select date and time');
      return;
    }

    setBooking(true);
    try {
      const formData = new FormData();
      formData.append('lawyerId', params.id);
      formData.append('dateTime', new Date(`${selectedDate}T${selectedTime}`).toISOString());
      formData.append('notes', notes);
      formData.append('duration', duration);
      if (chatFile) {
        formData.append('chatFile', chatFile);
      }

      const response = await api.post('/appointment/book', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Appointment booked successfully! Check your email for confirmation.');
      router.push('/appointments');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to book appointment');
    }
    setBooking(false);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p>Lawyer not found</p>
      </div>
    );
  }

  return (
    <UserNav>
      <Link href="/lawyers" className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6">
        <ArrowLeft className="w-5 h-5" />
        Back to Lawyers
      </Link>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-secondary to-secondary-800 p-8 text-white">
              <div className="flex items-center gap-6">
                {lawyer.profilePicture ? (
                  <img
                    src={lawyer.profilePicture}
                    alt={lawyer.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-3xl font-bold">
                      {lawyer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold">{lawyer.name}</h1>
                  <p className="text-white/80">{lawyer.specialization} Lawyer</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span>{parseFloat(lawyer.rating || 0).toFixed(1)}</span>
                    <span className="text-white/60">({lawyer.totalRatings || 0} reviews)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-lg font-semibold mb-4">About</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span>{lawyer.experience} years experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span>License: {lawyer.licenseNumber}</span>
                    </div>
                  </div>
                  {lawyer.bio && (
                    <p className="text-gray-600">{lawyer.bio}</p>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">Book Appointment</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={getMinDate()}
                        max={getMaxDate()}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Time
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                              selectedTime === time
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration
                      </label>
                      <div className="flex gap-2">
                        {[30, 60].map((d) => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                              duration === d
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {d} minutes
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-field min-h-[80px]"
                        placeholder="Briefly describe your legal concern..."
                      />
                    </div>

                    <div className="border-t pt-4">
                      <button
                        onClick={() => setShowChatOption(!showChatOption)}
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary-700"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {showChatOption ? 'Hide' : 'Add'} AI Chat Reference (Optional)
                      </button>

                      {showChatOption && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 mb-3">
                            Upload your AI chat conversation to help the lawyer understand your case better.
                          </p>
                          
                          <div className="space-y-3">
                            <button
                              onClick={downloadChat}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-700 transition-colors"
                            >
                              <File className="w-4 h-4" />
                              Download My AI Chat
                            </button>
                            
                            <div className="text-center text-gray-500 text-sm">or</div>
                            
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                              <input
                                type="file"
                                accept=".txt,.pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                                id="chat-upload"
                              />
                              <label htmlFor="chat-upload" className="cursor-pointer">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">
                                  {chatFile ? chatFile.name : 'Upload chat file (TXT, PDF, DOC)'}
                                </p>
                              </label>
                            </div>
                            
                            {chatFile && (
                              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <File className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-700">{chatFile.name}</span>
                                </div>
                                <button onClick={removeFile} className="text-red-500 hover:text-red-700">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleBooking}
                      disabled={!selectedDate || !selectedTime || booking}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      {booking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Booking...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Confirm Booking
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. You'll receive an email confirmation with appointment details</li>
              <li>2. The lawyer will review and confirm your appointment</li>
              <li>3. You'll get a meeting link for video consultation</li>
              <li>4. Join the video call at the scheduled time</li>
            </ol>
          </div>
    </UserNav>
  );
}
