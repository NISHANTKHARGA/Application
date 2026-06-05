'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Send, User, Users, Download, Trash2, Globe } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

export default function ChatPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [recommendedLawyers, setRecommendedLawyers] = useState([]);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [language, setLanguage] = useState('english');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      fetchChatHistory();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stripMarkdown = (text) => {
    return text.replace(/\*{1,2}/g, '');
  };

  const fetchChatHistory = async () => {
    try {
      const response = await api.get(`/chat/history/${user.id}`);
      if (response.data.messages && response.data.messages.length > 0) {
        const formatted = [];
        response.data.messages.forEach(msg => {
          formatted.push({
            id: msg.id + '-user',
            role: 'user',
            message: msg.message,
            timestamp: msg.createdAt
          });
          formatted.push({
            id: msg.id + '-bot',
            role: 'bot',
            message: stripMarkdown(msg.response),
            timestamp: msg.createdAt
          });
        });
        setMessages(formatted);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'bot',
          message: 'Welcome to KanoonSathi AI Legal Assistant! I can help you with any legal issue related to Nepal law. Describe your problem and I will analyze your case type and provide relevant guidance. Select Nepali above to get responses in Nepali.'
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      message: userMessage,
      timestamp: new Date()
    }]);

    setIsTyping(true);
    setRecommendedLawyers([]);
    setCurrentIssue(null);

    try {
      const response = await api.post('/chat', {
        message: userMessage,
        language
      });

      const botText = stripMarkdown(response.data.response);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        message: botText,
        timestamp: new Date(),
        identifiedIssue: response.data.identifiedIssue
      }]);

      if (response.data.identifiedIssue && response.data.identifiedIssue.specialization) {
        setCurrentIssue(response.data.identifiedIssue);
        fetchRecommendedLawyers(response.data.identifiedIssue.specialization);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response. Please try again.');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        message: 'I apologize, but I encountered an issue. Please try again or consult a verified lawyer on KanoonSathi.',
        timestamp: new Date()
      }]);
    }

    setIsTyping(false);
  };

  const fetchRecommendedLawyers = async (specialization) => {
    setLoadingLawyers(true);
    try {
      const response = await api.get(`/lawyer/specialization/${encodeURIComponent(specialization)}`);
      if (response.data.lawyers && response.data.lawyers.length > 0) {
        setRecommendedLawyers(response.data.lawyers.slice(0, 4));
      }
    } catch (error) {
      console.log('No lawyers found for this specialization');
    }
    setLoadingLawyers(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const downloadConversation = async () => {
    try {
      const response = await api.get(`/chat/download/${user.id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kanoonsathi-consultation-${Date.now()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Conversation downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download conversation');
    }
  };

  const clearChat = async () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      try {
        await api.delete('/chat');
      } catch (e) {
        // Continue even if delete fails
      }
      setMessages([{
        id: 'welcome',
        role: 'bot',
        message: language === 'nepali'
          ? 'KanoonSathi AI Legal Assistant मा तपाईंलाई स्वागत छ। तपाईंको कानुनी समस्या लेख्नुहोस्, म त्यसको विश्लेषण गरी सही मार्गदर्शन प्रदान गर्नेछु।'
          : 'Welcome to KanoonSathi AI Legal Assistant! Describe your legal problem below and I will analyze your case type and provide relevant guidance.'
      }]);
      toast.success('Chat cleared');
    }
  };

  const toggleLanguage = (lang) => {
    setLanguage(lang);
    toast.success(lang === 'nepali' ? 'भाषा नेपालीमा परिवर्तन गरियो' : 'Language switched to English');
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
      <div className="bg-gradient-to-r from-primary to-primary-700 -mx-4 -mt-4 lg:-mx-8 lg:-mt-8 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">AI Legal Assistant</h1>
              <p className="text-sm text-white/80 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {language === 'nepali' ? 'अनलाइन - नेपाली कानुन विज्ञ' : 'Online - Nepali Law Expert'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/20 rounded-lg p-0.5">
              <button
                onClick={() => toggleLanguage('english')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  language === 'english' ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                EN
              </button>
              <button
                onClick={() => toggleLanguage('nepali')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  language === 'nepali' ? 'bg-white text-primary shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                ने
              </button>
            </div>
            <button
              onClick={downloadConversation}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
              title="Download Conversation"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={clearChat}
              className="p-2 text-white/80 hover:text-red-300 hover:bg-white/10 rounded-lg"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
        <div className="h-[calc(100vh-64px)] flex flex-col">
          <div className="bg-gradient-to-r from-primary to-primary-700 px-6 py-4 text-white">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">AI Legal Assistant</h1>
                <p className="text-sm text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {language === 'nepali' ? 'अनलाइन - नेपाली कानुन विज्ञ' : 'Online - Nepali Law Expert'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                {msg.role === 'bot' && (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white shadow-md'} p-4 rounded-2xl ${msg.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                    <div className="text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </div>
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.role === 'bot' && msg.identifiedIssue?.specialization && (
                      <span className="ml-2 text-primary"> &bull; {msg.identifiedIssue.specialization}</span>
                    )}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center mr-3">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white shadow-md p-4 rounded-2xl rounded-bl-md flex items-center gap-1">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {recommendedLawyers.length > 0 && (
            <div className="bg-gradient-to-r from-secondary to-secondary-800 px-6 py-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-white" />
                  <h3 className="text-white font-semibold">
                    {language === 'nepali' ? `सिफारिस गरिएका वकिलहरू` : `Recommended ${currentIssue?.specialization || 'Legal'} Lawyers`}
                  </h3>
                </div>
                {loadingLawyers ? (
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {language === 'nepali' ? 'वकिलहरू खोज्दै...' : 'Finding lawyers for you...'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {recommendedLawyers.map((lawyer) => (
                      <Link
                        key={lawyer.id}
                        href={`/lawyers/${lawyer.id}`}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-3 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {lawyer.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{lawyer.name}</p>
                            <p className="text-white/70 text-xs">{lawyer.specialization}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/80">
                          <span>{lawyer.experience} yrs exp</span>
                          <span className="flex items-center gap-1">
                            <span className="text-yellow-400">★</span>
                            {lawyer.rating || '4.5'}
                          </span>
                        </div>
                        <button className="w-full mt-2 bg-primary hover:bg-primary-600 text-white text-xs py-1.5 rounded transition-colors">
                          {language === 'nepali' ? 'परामर्श बुक गर्नुहोस्' : 'Book Consultation'}
                        </button>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-center">
                  <Link href={`/lawyers?spec=${encodeURIComponent(currentIssue?.specialization || '')}`} className="text-white/80 hover:text-white text-sm underline">
                    {language === 'nepali' ? `सबै वकिलहरू हेर्नुहोस् →` : `View all ${currentIssue?.specialization} lawyers →`}
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === 'nepali' ? 'आफ्नो कानुनी समस्या लेख्नुहोस्...' : "Describe your legal issue in Nepali or English..."}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                  rows={1}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="btn-primary !px-6 !py-3 flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">{language === 'nepali' ? 'पठाउनुहोस्' : 'Send'}</span>
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {language === 'nepali' ? 'AI प्रतिक्रिया केवल मार्गदर्शनको लागि हो। कानुनी निर्णयका लागि प्रमाणित वकिलसँग परामर्श गर्नुहोस्।' : 'AI responses are for guidance only. Consult a verified lawyer for legal decisions.'}
                </p>
                <Link href="/lawyers" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {language === 'nepali' ? 'वकिल खोज्नुहोस्' : 'Find a Lawyer'}
                </Link>
              </div>
            </div>
          </div>
        </div>
    </UserNav>
  );
}
