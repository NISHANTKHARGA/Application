'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, User, Mail, Phone, Lock, ChevronLeft, Save, AlertCircle, Calendar, BookOpen, Clock, Home, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function LawyerProfilePage() {
  const { user, isAuthenticated, isLoading, logout, role } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    availability: 'available',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        availability: user.availability || 'available',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || role !== 'lawyer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/lawyer/profile', {
        name: formData.name.trim(),
        phone: formData.phone,
        bio: formData.bio,
        availability: formData.availability,
      });
      if (response.data.success) {
        const updated = { ...user, ...response.data.lawyer };
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userUpdate'));
        setSuccess('Profile updated successfully');
        setEditing(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword) {
      setError('Current password is required');
      return;
    }
    if (!formData.newPassword) {
      setError('New password is required');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      if (response.data.success) {
        setSuccess('Password changed successfully');
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    }
    setSaving(false);
  };

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
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <span className="text-gray-700 hidden sm:inline">{user?.name}</span>
              <button onClick={logout} className="text-gray-600 hover:text-red-500">
                <Lock className="w-5 h-5" />
              </button>
            </div>
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
                  className={`sidebar-link ${item.href === '/lawyer/profile' ? 'sidebar-link-active' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/lawyer/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-secondary">Lawyer Profile</h1>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="btn-primary">
                    Edit Profile
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <Save className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-secondary">{user?.name}</h2>
                    <p className="text-gray-500">Lawyer Account</p>
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full mt-1">
                      {user?.specialization || 'General'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={!editing}
                        className="input-field pl-12 disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="input-field pl-12 bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={!editing}
                        className="input-field pl-12 disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={user?.specialization || 'Not set'}
                        disabled
                        className="input-field pl-12 bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!editing}
                      rows={4}
                      className="input-field disabled:bg-gray-100"
                      placeholder="Tell clients about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                    <select
                      name="availability"
                      value={formData.availability}
                      onChange={handleChange}
                      disabled={!editing}
                      className="input-field disabled:bg-gray-100"
                    >
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                        disabled
                        className="input-field pl-12 bg-gray-100"
                      />
                    </div>
                  </div>
                </div>

                {editing && (
                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setEditing(false); setFormData(prev => ({ ...prev, name: user?.name || '', phone: user?.phone || '', bio: user?.bio || '', availability: user?.availability || 'available' })); }} className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-6">
              <h2 className="text-xl font-bold text-secondary mb-6">Change Password</h2>
              <div className="grid gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className="input-field pl-12"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="input-field pl-12"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field pl-12"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button onClick={handleChangePassword} disabled={saving} className="btn-primary">
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
