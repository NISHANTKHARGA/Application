'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Mail, Lock, User, Phone, FileText, Briefcase, Calendar, Upload, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const specializations = [
  'Criminal',
  'Civil',
  'Business',
  'Family',
  'Property',
  'Immigration',
  'Constitutional',
  'Labor',
  'Tax',
  'Other',
];

export default function LawyerRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    experience: '',
    bio: '',
  });
  const [document, setDocument] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { lawyerRegister } = useAuth();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setErrors({ document: 'License document must be less than 3MB' });
        return;
      }
      setErrors(prev => ({ ...prev, document: '' }));
      setDocument(file);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        setErrors({ profilePicture: 'Profile picture must be less than 500KB' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrors({ profilePicture: 'Only image files are allowed' });
        return;
      }
      setErrors(prev => ({ ...prev, profilePicture: '' }));
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!formData.name.trim()) {
      setErrors({ name: 'Full name is required' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setErrors({ email: 'Enter a valid email with @ and . (no spaces)' });
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setErrors({ phone: 'Phone number must be exactly 10 digits' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setLoading(true);

    if (!profilePicturePreview) {
      setErrors({ profilePicture: 'Profile picture is required' });
      setLoading(false);
      return;
    }

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });
    data.append('profilePicture', profilePicturePreview);
    if (document) {
      data.append('document', document);
    }

    const result = await lawyerRegister(data);

    if (result.success) {
      router.push('/login?registered=true');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold text-secondary">KanoonSathi</span>
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-primary transition-colors">
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Briefcase className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-secondary mb-2">Register as a Lawyer</h1>
          <p className="text-gray-600">
            Join our network of verified legal professionals in Nepal
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your application will be reviewed by our team. You'll receive an email once your account is approved.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                {errors.name && (
                  <p className="text-red-500 text-xs mb-1.5">{errors.name}</p>
                )}
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                {errors.email && (
                  <p className="text-red-500 text-xs mb-1.5">{errors.email}</p>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                {errors.phone && (
                  <p className="text-red-500 text-xs mb-1.5">{errors.phone}</p>
                )}
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="+977 98XXXXXXXX"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  License Number *
                </label>
                {errors.licenseNumber && (
                  <p className="text-red-500 text-xs mb-1.5">{errors.licenseNumber}</p>
                )}
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="e.g., LA-12345"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialization *
                </label>
                <select
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Select specialization</option>
                  {specializations.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="input-field pl-12"
                    placeholder="e.g., 5"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              {errors.password && (
                <p className="text-red-500 text-xs mb-1.5">{errors.password}</p>
              )}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-12 pr-12"
                  placeholder="Create a strong password"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mb-1.5">{errors.confirmPassword}</p>
              )}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field pl-12"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="input-field min-h-[100px]"
                placeholder="Tell clients about your expertise and experience..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture *
              </label>
              {errors.profilePicture && (
                <p className="text-red-500 text-xs mb-1.5">{errors.profilePicture}</p>
              )}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  id="profile-picture-upload"
                />
                <label htmlFor="profile-picture-upload" className="cursor-pointer">
                  {profilePicturePreview ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={profilePicturePreview}
                        alt="Profile preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                      />
                      <p className="text-primary font-medium">Change photo</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-gray-600">Click to upload your profile photo</p>
                      <p className="text-sm text-gray-400 mt-1">JPG, PNG up to 2MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload License Document (PDF) *
              </label>
              {errors.document && (
                <p className="text-red-500 text-xs mb-1.5">{errors.document}</p>
              )}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="document-upload"
                  required
                />
                <label htmlFor="document-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  {document ? (
                    <div className="text-primary font-medium">{document.name}</div>
                  ) : (
                    <>
                      <p className="text-gray-600">Click to upload your license document</p>
                      <p className="text-sm text-gray-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input type="checkbox" id="terms" className="mt-1" required />
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting application...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
