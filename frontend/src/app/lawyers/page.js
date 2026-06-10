'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Filter, Star, MapPin, Phone, Mail, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

const specializations = [
  'All',
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

export default function LawyersPage() {
  const { user, isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [selectedLawyer, setSelectedLawyer] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    try {
      const response = await api.get('/lawyer/all');
      setLawyers(response.data.lawyers || []);
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
      toast.error('Failed to load lawyers');
    } finally {
      setLoading(false);
    }
  };

  const filteredLawyers = lawyers.filter(lawyer => {
    const matchesSearch = (lawyer.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (lawyer.specialization?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesSpec = selectedSpec === 'All' || (lawyer.specialization?.toLowerCase() || '') === selectedSpec.toLowerCase();
    return matchesSearch && matchesSpec;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <UserNav>
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-4">
          Find a Lawyer
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Browse our verified network of legal professionals specialized in various areas of Nepali law
        </p>
      </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or specialization..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-12"
                />
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpec(spec)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                      selectedSpec === spec
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredLawyers.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No lawyers found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLawyers.map((lawyer) => (
                <div key={lawyer.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {lawyer.profilePicture ? (
                        <img
                          src={lawyer.profilePicture}
                          alt={lawyer.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl font-bold">
                            {lawyer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{lawyer.name}</h3>
                        <p className="text-primary text-sm">{lawyer.specialization}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-gray-600">
                            {parseFloat(lawyer.rating || 0).toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({lawyer.totalRatings || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {lawyer.experience} years experience
                      </div>
                      {lawyer.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          {lawyer.phone}
                        </div>
                      )}
                    </div>
                    {lawyer.bio && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">{lawyer.bio}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedLawyer(lawyer)}
                        className="flex-1 btn-outline !py-2 !text-sm"
                      >
                        View Profile
                      </button>
                      {isAuthenticated && role === 'user' && (
                        <Link
                          href={`/lawyers/${lawyer.id}`}
                          className="flex-1 btn-primary !py-2 !text-sm text-center"
                        >
                          Book Now
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      {selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {selectedLawyer.profilePicture ? (
                  <img
                    src={selectedLawyer.profilePicture}
                    alt={selectedLawyer.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {selectedLawyer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{selectedLawyer.name}</h2>
                  <p className="text-primary">{selectedLawyer.specialization}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm">{parseFloat(selectedLawyer.rating || 0).toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({selectedLawyer.totalRatings || 0} reviews)</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLawyer(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">Experience</h4>
                  <p className="text-gray-600">{selectedLawyer.experience} years in {selectedLawyer.specialization} law</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">License</h4>
                  <p className="text-gray-600">{selectedLawyer.licenseNumber}</p>
                </div>
                {selectedLawyer.bio && (
                  <div>
                    <h4 className="font-semibold mb-2">About</h4>
                    <p className="text-gray-600">{selectedLawyer.bio}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedLawyer(null)}
                  className="flex-1 btn-outline"
                >
                  Close
                </button>
                {isAuthenticated && role === 'user' && (
                  <Link
                    href={`/lawyers/${selectedLawyer.id}`}
                    className="flex-1 btn-primary text-center"
                  >
                    Book Appointment
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </UserNav>
  );
}
