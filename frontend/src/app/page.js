'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, MessageSquare, Calendar, Video, Shield, Globe, Clock, Users, ChevronRight, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-secondary">KanoonSathi</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link href="/lawyers" className="text-gray-600 hover:text-primary transition-colors">Find Lawyers</Link>
              <Link href="/chat" className="text-gray-600 hover:text-primary transition-colors">AI Assistant</Link>
              <Link href="/login" className="text-gray-600 hover:text-primary transition-colors">Login</Link>
              <Link href="/register" className="btn-primary !py-2 !px-5 text-sm">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 bg-gradient-to-br from-secondary via-secondary-800 to-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <Globe className="w-4 h-4" />
                <span className="text-sm">Nepal's Premier Legal Platform</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Your Legal Journey
                <span className="block text-accent">Starts Here</span>
              </h1>
              <p className="text-lg text-gray-200 mb-8 max-w-lg">
                Get instant legal guidance powered by AI, connect with verified Nepal lawyers, and schedule consultations - all in one platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/chat" className="btn-primary inline-flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat with AI
                </Link>
                <button onClick={() => router.push(isAuthenticated ? '/lawyers' : '/login')} className="bg-white text-secondary px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center gap-2">
                  Consult with Lawyer
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-8 mt-10">
                <div>
                  <div className="text-3xl font-bold">50+</div>
                  <div className="text-sm text-gray-300">Legal Consultations</div>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div>
                  <div className="text-3xl font-bold">15+</div>
                  <div className="text-sm text-gray-300">Verified Lawyers</div>
                </div>
                <div className="w-px h-12 bg-white/20" />
                <div>
                  <div className="text-3xl font-bold">24/7</div>
                  <div className="text-sm text-gray-300">AI Support</div>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
                <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">AI Legal Assistant</div>
                      <div className="text-sm text-green-400">Online</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="chat-bubble-bot">
                      Namaste! I'm your legal assistant. How can I help you today?
                    </div>
                    <div className="chat-bubble-user">
                      मलाई जग्गा सम्बन्धी कानुनी समस्या छ
                    </div>
                    <div className="chat-bubble-bot">
                      तपाईंको जग्गा सम्बन्धी समस्यामा म सहयोग गर्न सक्छु। केही प्रश्नहरू छन्...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">
              How KanoonSathi Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Get legal help in three simple steps. Our platform makes accessing legal guidance easy and affordable.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-primary-50 transition-colors group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Describe Your Issue</h3>
              <p className="text-gray-600">Chat with our AI assistant in Nepali or English about your legal concern</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-primary-50 transition-colors group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Get Matched</h3>
              <p className="text-gray-600">Connect with verified lawyers specialized in your legal matter</p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-primary-50 transition-colors group">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Schedule Consultation</h3>
              <p className="text-gray-600">Book appointments and meet lawyers via secure video calls</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary mb-4">
              Powerful Features
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need for seamless legal consultation
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: MessageSquare, title: 'AI Chatbot', desc: 'Legal guidance in Nepali & English' },
              { icon: Calendar, title: 'Easy Booking', desc: 'Schedule appointments instantly' },
              { icon: Video, title: 'Video Calls', desc: 'Secure video consultations' },
              { icon: Shield, title: 'Verified Lawyers', desc: 'All lawyers are thoroughly vetted' },
              { icon: Clock, title: '24/7 Support', desc: 'AI assistant available round the clock' },
              { icon: Globe, title: 'Nepal Law Focus', desc: 'Specialized in Nepali regulations' },
              { icon: Star, title: 'Ratings & Reviews', desc: 'Choose based on client feedback' },
              { icon: CheckCircle, title: 'Email Updates', desc: 'Instant confirmations & reminders' },
            ].map((feature, index) => (
              <div key={index} className="card flex flex-col items-start">
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Legal Help?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-8">
            Join thousands of Nepalese citizens who trust KanoonSathi for their legal needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary inline-flex items-center justify-center gap-2">
              Create Free Account
            </Link>
            <Link href="/lawyers" className="bg-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors inline-flex items-center justify-center gap-2">
              Browse Lawyers
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-6 h-6 text-primary" />
                <span className="text-lg font-bold text-white">KanoonSathi</span>
              </div>
              <p className="text-sm">Making legal help accessible to everyone in Nepal through AI technology.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/lawyers" className="hover:text-primary transition-colors">Find Lawyers</Link></li>
                <li><Link href="/chat" className="hover:text-primary transition-colors">AI Assistant</Link></li>
                <li><Link href="/register" className="hover:text-primary transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal Areas</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/lawyers?spec=Criminal" className="hover:text-primary transition-colors">Criminal Law</Link></li>
                <li><Link href="/lawyers?spec=Civil" className="hover:text-primary transition-colors">Civil Law</Link></li>
                <li><Link href="/lawyers?spec=Property" className="hover:text-primary transition-colors">Property Law</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>support@kanoonsathi.np</li>
                <li>Kathmandu, Nepal</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 KanoonSathi. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
