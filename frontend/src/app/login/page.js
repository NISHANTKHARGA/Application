'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Mail, Lock, Eye, EyeOff, User, Briefcase, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';



export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email or phone number is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    const result = await login(email, password, userType);

    if (result.success) {
      if (result.role === 'lawyer') {
        router.push('/lawyer/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.message || 'Invalid credentials');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary-800 to-secondary p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Scale className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold text-white">KanoonSathi</span>
          </Link>
        </div>
        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
          <p className="text-gray-300 text-lg">
            Continue your legal journey with AI-powered assistance and connect with Nepal's best lawyers.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <span>Get answers in Nepali or English</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <span>Secure and confidential</span>
            </div>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          &copy; 2024 KanoonSathi. All rights reserved.
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-10 h-10 text-primary" />
              <span className="text-2xl font-bold text-secondary">KanoonSathi</span>
            </Link>
          </div>

          <h2 className="text-3xl font-bold text-secondary mb-2">Sign In</h2>
          <p className="text-gray-600 mb-6">Sign in to your account</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {[
              { value: 'user', label: 'User' },
              { value: 'lawyer', label: 'Lawyer' },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => setUserType(type.value)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  userType === type.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email or Phone Number
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="you@example.com or 98XXXXXXXX"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Use email or 10-digit phone (e.g., 984XXXXXXX)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12 pr-12"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {userType === 'user' && (
            <p className="text-center mt-6 text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Register here
              </Link>
            </p>
          )}

          {userType === 'lawyer' && (
            <p className="text-center mt-6 text-gray-600">
              Want to join as a lawyer?{' '}
              <Link href="/register/lawyer" className="text-primary font-semibold hover:underline">
                Apply here
              </Link>
            </p>
          )}


        </div>
      </div>
    </div>
  );
}
