'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Send, User, Users, Download, Trash2, Globe, Sparkles, ArrowRight, Bot, MessageSquare, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

const FREE_PROMPT_LIMIT = 10;
const STORAGE_KEY = 'kanoonsathi_free_prompts';

const SUGGESTED_QUESTIONS = [
  'What is the divorce process in Nepal?',
  'How do I register a company?',
  'What are my rights as a tenant?',
  'How to file an FIR in Nepal?',
  'What is the Cyber Law in Nepal?',
  'Property inheritance rules in Nepal',
];

function getAnonymousPromptCount() {
  if (typeof window === 'undefined') return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch { return 0; }
}

function setAnonymousPromptCount(count) {
  try { localStorage.setItem(STORAGE_KEY, String(count)); } catch {}
}

export default function ChatPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recommendedLawyers, setRecommendedLawyers] = useState([]);
  const [currentIssue, setCurrentIssue] = useState(null);
  const [loadingLawyers, setLoadingLawyers] = useState(false);
  const [language, setLanguage] = useState('english');
  const [freePromptsUsed, setFreePromptsUsed] = useState(0);
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const messagesEndRef = useRef(null);

  const isAnonymous = !isLoading && !isAuthenticated;
  const isLimitReached = isAnonymous && freePromptsUsed >= FREE_PROMPT_LIMIT;
  const remainingPrompts = Math.max(0, FREE_PROMPT_LIMIT - freePromptsUsed);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      fetchChatHistory();
    } else if (!isLoading && !isAuthenticated) {
      const used = getAnonymousPromptCount();
      setFreePromptsUsed(used);
      setMessages([{
        id: 'welcome', role: 'bot', message: language === 'nepali'
          ? 'नमस्ते! म KanoonSathi सहायक हुँ। तपाईंलाई बिना लगइन १० वटा प्रश्न सोध्न पाइन्छ। कृपया तल आफ्नो प्रश्न लेख्नुहोस्।'
          : 'Hello! I\'m KanoonSathi AI. You can ask up to ' + FREE_PROMPT_LIMIT + ' questions for free without signing in. Ask me anything below!'
      }]);
    }
  }, [isLoading, isAuthenticated, user, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stripMarkdown = (text) => text.replace(/\*{1,2}/g, '');

  const fetchChatHistory = async () => {
    try {
      const response = await api.get(`/chat/history/${user.id}`);
      if (response.data.messages?.length > 0) {
        const formatted = [];
        response.data.messages.forEach(msg => {
          formatted.push({ id: msg.id + '-user', role: 'user', message: msg.message, timestamp: msg.createdAt });
          formatted.push({ id: msg.id + '-bot', role: 'bot', message: stripMarkdown(msg.response), timestamp: msg.createdAt });
        });
        setMessages(formatted);
      } else {
        setMessages([{
          id: 'welcome', role: 'bot', message: language === 'nepali'
            ? 'नमस्ते! म KanoonSathi सहायक हुँ। म तपाईंलाई नेपाली कानूनको बारेमा जानकारी दिन मद्दत गर्न सक्छु। कृपया तल आफ्नो प्रश्न लेख्नुहोस्।'
            : 'Hello! I\'m your KanoonSathi legal assistant. I can help you with information about Nepal law, legal procedures, and your rights. Ask me anything below.'
        }]);
      }
    } catch (error) {
      console.error('Chat history error:', error);
    }
  };

  const handleSend = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage) return;

    if (isLimitReached) {
      setShowLoginOverlay(true);
      return;
    }

    setInput('');

    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user', message: userMessage, timestamp: new Date()
    }]);

    setIsTyping(true);
    setRecommendedLawyers([]);
    setCurrentIssue(null);

    if (isAnonymous) {
      const newCount = freePromptsUsed + 1;
      setFreePromptsUsed(newCount);
      setAnonymousPromptCount(newCount);
      if (newCount >= FREE_PROMPT_LIMIT) {
        setShowLoginOverlay(true);
      }
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, language }),
      });
      const data = await response.json();
      const botText = stripMarkdown(data.response);

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot', message: botText, timestamp: new Date(),
        identifiedIssue: data.identifiedIssue
      }]);

      if (data.identifiedIssue?.specialization) {
        setCurrentIssue(data.identifiedIssue);
        fetchRecommendedLawyers(data.identifiedIssue.specialization);
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'bot',
        message: 'I apologize, I encountered an issue. Please try again.',
        timestamp: new Date()
      }]);
    }
    setIsTyping(false);
  };

  const fetchRecommendedLawyers = async (specialization) => {
    setLoadingLawyers(true);
    setRecommendedLawyers([]);
    try {
      const response = await api.get('/lawyer/all');
      const lawyers = response.data.lawyers || [];
      const matched = lawyers.filter(l =>
        l.specialization?.toLowerCase().includes(specialization.toLowerCase()) ||
        specialization.toLowerCase().includes(l.specialization?.toLowerCase())
      );
      if (matched.length > 0) {
        setRecommendedLawyers(matched.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
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
      const response = await api.get(`/chat/download/${user.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kanoonsathi-consultation-${Date.now()}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Conversation downloaded');
    } catch { toast.error('Download failed'); }
  };

  const clearChat = async () => {
    if (!confirm('Clear this conversation?')) return;
    try { await api.delete('/chat'); } catch { /* ok */ }
    setMessages([{
      id: 'welcome', role: 'bot',
      message: language === 'nepali'
        ? 'नमस्ते! म KanoonSathi सहायक हुँ। म तपाईंलाई नेपाली कानूनको बारेमा जानकारी दिन मद्दत गर्न सक्छु।'
        : 'Hello! I\'m your KanoonSathi legal assistant. I can help you with information about Nepal law, legal procedures, and your rights.'
    }]);
    toast.success('Chat cleared');
  };

  const toggleLanguage = (lang) => {
    setLanguage(lang);
    toast.success(lang === 'nepali' ? 'भाषा नेपालीमा परिवर्तन गरियो' : 'Language switched to English');
  };

  const isWelcome = messages.length === 1 && messages[0].id === 'welcome';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chatContent = (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-gray-50 relative">
      {showLoginOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {language === 'nepali' ? 'नि:शुल्क सीमा पूरा भयो!' : 'Free Limit Reached!'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {language === 'nepali'
                ? `तपाईंले ${FREE_PROMPT_LIMIT} वटा नि:शुल्क प्रश्नहरू प्रयोग गर्नुभयो। थप प्रश्न सोध्न कृपया लगइन वा साइनअप गर्नुहोस्।`
                : `You've used all ${FREE_PROMPT_LIMIT} free questions. Sign in or create an account to continue asking.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition-colors">
                <LogIn className="w-4 h-4" />
                {language === 'nepali' ? 'लगइन' : 'Log In'}
              </Link>
              <Link href="/register" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-xl font-medium text-sm hover:bg-secondary-800 transition-colors">
                <UserPlus className="w-4 h-4" />
                {language === 'nepali' ? 'साइनअप' : 'Sign Up'}
              </Link>
            </div>
            <button onClick={() => setShowLoginOverlay(false)} className="mt-4 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {language === 'nepali' ? 'बन्द गर्नुहोस्' : 'Close'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-gray-900">KanoonSathi AI</h1>
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded">Online</span>
              </div>
              <p className="text-xs text-gray-500">Nepal law expert &bull; Instant answers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAnonymous && remainingPrompts > 0 && (
              <span className={`px-2.5 py-1 text-[11px] font-medium rounded-lg ${
                remainingPrompts <= 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {language === 'nepali'
                  ? `${remainingPrompts} प्रश्न बाँकी`
                  : `${remainingPrompts} free`}
              </span>
            )}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => toggleLanguage('english')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${language === 'english' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Globe className="w-3 h-3 inline mr-1" />EN
              </button>
              <button onClick={() => toggleLanguage('nepali')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${language === 'nepali' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                ने
              </button>
            </div>
            {isAuthenticated && (
              <>
                <button onClick={downloadConversation} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={clearChat} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {isWelcome && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {language === 'nepali' ? 'तपाईंलाई कसरी मद्दत गर्न सक्छु?' : 'How can I help you today?'}
              </h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                {isAnonymous
                  ? (language === 'nepali'
                    ? 'नेपाली कानूनको बारेमा कुनै पनि प्रश्न सोध्नुहोस्। बिना लगइन १० वटा प्रश्न नि:शुल्क।'
                    : 'Ask any question about Nepal law. Free questions without sign-in.')
                  : (language === 'nepali'
                    ? 'नेपाली कानूनको बारेमा कुनै पनि प्रश्न सोध्नुहोस्। म तपाईंलाई कानूनी जानकारी, प्रक्रिया र तपाईंको अधिकारको बारेमा मार्गदर्शन गर्न सक्छु।'
                    : 'Ask any question about Nepal law. I can provide legal information, guide you through procedures, and explain your rights.')}
              </p>
              {isAnonymous && (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {language === 'nepali' ? 'नि:शुल्क प्रश्नहरू:' : 'Free questions:'}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: FREE_PROMPT_LIMIT }).map((_, i) => (
                        <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          i < freePromptsUsed ? 'bg-primary' : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                  </div>
                  <Link href="/register" className="text-xs text-primary hover:underline">
                    {language === 'nepali' ? 'साइनअप गर्न सबै प्रश्न असीमित पाउनुहोस् →' : 'Sign up for unlimited questions →'}
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    disabled={isLimitReached}
                    className="text-left px-4 py-2.5 bg-white border border-gray-200 hover:border-primary hover:shadow-sm rounded-xl text-sm text-gray-700 hover:text-primary transition-all flex items-center justify-between gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="line-clamp-1">{q}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            msg.id !== 'welcome' && (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                {msg.role === 'bot' && (
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 shadow-sm mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-gray-100 shadow-sm'} px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                  </div>
                  <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[11px] text-gray-400">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    {msg.role === 'bot' && msg.identifiedIssue?.specialization && (
                      <span className="text-[11px] text-primary font-medium">{msg.identifiedIssue.specialization}</span>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-9 h-9 bg-secondary rounded-xl flex items-center justify-center ml-3 flex-shrink-0 shadow-sm mt-1">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            )
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-700 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm px-5 py-4 rounded-2xl rounded-bl-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {currentIssue?.specialization && (
        <div className="bg-gradient-to-r from-secondary to-secondary-800 px-6 py-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-white" />
              <h3 className="text-white font-semibold text-sm">
                {language === 'nepali' ? 'सिफारिस गरिएका वकिलहरू' : `Recommended ${currentIssue.specialization} Lawyers`}
              </h3>
            </div>
            {loadingLawyers ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="text-white/70 text-sm">
                  {language === 'nepali' ? 'वकिलहरू खोज्दै...' : 'Finding lawyers...'}
                </span>
              </div>
            ) : recommendedLawyers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recommendedLawyers.map((lawyer) => (
                  <Link key={lawyer.id} href={`/lawyers/${lawyer.id}`}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-3 transition-all group">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 bg-primary/30 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {lawyer.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{lawyer.name}</p>
                        <p className="text-white/60 text-xs">{lawyer.specialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/70">
                      <span>{lawyer.experience} yrs</span>
                      <span className="flex items-center gap-0.5">
                        <span className="text-yellow-400">★</span>{lawyer.rating || '4.5'}
                      </span>
                    </div>
                    <div className="mt-2 text-center text-xs text-white/80 bg-primary/20 group-hover:bg-primary/40 rounded py-1.5 transition-colors">
                      {language === 'nepali' ? 'परामर्श बुक गर्नुहोस्' : 'Book Consultation'}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-white/70 text-sm mb-2">
                  {language === 'nepali'
                    ? `अहिले "${currentIssue.specialization}" क्षेत्रमा वकिल उपलब्ध छैनन्।`
                    : `No lawyers currently available for ${currentIssue.specialization}.`}
                </p>
                <Link href="/lawyers" className="inline-flex items-center gap-1 text-white text-sm font-medium hover:underline">
                  <Users className="w-4 h-4" />
                  {language === 'nepali' ? 'सबै वकिलहरू ब्राउज गर्नुहोस् →' : 'Browse all lawyers →'}
                </Link>
              </div>
            )}
            <div className="mt-2.5 text-center">
              <Link href="/lawyers" className="text-white/70 hover:text-white text-xs underline">
                {language === 'nepali' ? 'सबै वकिलहरू हेर्नुहोस् →' : 'View all lawyers →'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-4xl mx-auto">
          {isLimitReached && (
            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-xs text-amber-700">
                {language === 'nepali'
                  ? 'तपाईंको नि:शुल्क प्रश्न सकियो। थप सोध्न लगइन गर्नुहोस्।'
                  : 'Free questions used up. Log in to ask more.'}
              </span>
              <div className="flex gap-2">
                <Link href="/login" className="text-xs font-medium text-primary hover:underline">
                  {language === 'nepali' ? 'लगइन' : 'Login'}
                </Link>
                <Link href="/register" className="text-xs font-medium text-secondary hover:underline">
                  {language === 'nepali' ? 'साइनअप' : 'Sign Up'}
                </Link>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isLimitReached
                  ? (language === 'nepali' ? 'लगइन गर्नुहोस् वा साइनअप गर्नुहोस्...' : 'Login or sign up to continue...')
                  : (language === 'nepali' ? 'आफ्नो कानुनी प्रश्न लेख्नुहोस्...' : "Ask a legal question...")}
                disabled={isLimitReached}
                className="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none text-sm bg-gray-50 hover:bg-white focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
              />
            </div>
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping || isLimitReached}
              className="btn-primary !p-2.5 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {isLimitReached ? <Lock className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-gray-400">{language === 'nepali' ? 'AI जानकारी मात्र हो, कानुनी सल्लाह होइन।' : 'AI responses are for informational purposes only.'}</p>
            <Link href="/lawyers" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />{language === 'nepali' ? 'वकिल खोज्नुहोस्' : 'Find a Lawyer'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (isAnonymous) {
    return chatContent;
  }

  return <UserNav>{chatContent}</UserNav>;
}
