'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Star, Phone, Calendar, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import UserNav from '@/components/UserNav';

const specializations = [
  'All', 'Criminal', 'Civil', 'Business', 'Family', 'Property',
  'Immigration', 'Constitutional', 'Labor', 'Tax', 'Other',
];

export default function LawyersPage() {
  const { user, isAuthenticated, isLoading: authLoading, role } = useAuth();
  const router = useRouter();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All');
  const [selectedLawyer, setSelectedLawyer] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    loadLawyers('', 'All');
  }, []);

  async function loadLawyers(searchVal, specVal) {
    try {
      setLoading(true);
      const params = {};
      if (searchVal) params.search = searchVal;
      if (specVal && specVal !== 'All') params.specialization = specVal;
      const res = await api.get('/lawyer/all', { params });
      setLawyers(res.data.lawyers || []);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  }

  function doSearch() {
    loadLawyers(searchText, selectedSpec);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') doSearch();
  }

  function selectSpec(spec) {
    setSelectedSpec(spec);
    loadLawyers(searchText, spec);
  }

  function clearAll() {
    setSearchText('');
    setSelectedSpec('All');
    loadLawyers('', 'All');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <UserNav>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-3">
          Find a Lawyer
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto text-sm">
          Browse our verified network of legal professionals in Nepal
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or specialization..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field pl-10 pr-10"
              />
              {searchText && (
                <button
                  onClick={() => { setSearchText(''); loadLawyers('', selectedSpec); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={doSearch}
              disabled={loading}
              className="btn-primary !py-2.5 !px-5 whitespace-nowrap text-sm font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Searching
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-3 mt-3 border-t border-gray-100">
          {specializations.map((spec) => (
            <button
              key={spec}
              onClick={() => selectSpec(spec)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedSpec === spec
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {!loading && lawyers.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{lawyers.length}</span> lawyer{lawyers.length !== 1 ? 's' : ''}
            {(searchText || selectedSpec !== 'All') && (
              <button onClick={clearAll} className="ml-3 text-primary hover:underline text-xs">
                Clear all filters
              </button>
            )}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
              <div className="flex gap-2">
                <div className="h-9 bg-gray-100 rounded flex-1" />
                <div className="h-9 bg-gray-100 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : lawyers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No lawyers found</h3>
          <p className="text-gray-500 text-sm mb-4">
            {searchText
              ? `No results for "${searchText}"${selectedSpec !== 'All' ? ` in ${selectedSpec}` : ''}`
              : 'No lawyers match this filter'}
          </p>
          <button onClick={clearAll} className="text-primary hover:underline text-sm font-medium">
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lawyers.map((lawyer) => (
            <div key={lawyer.id} className="bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden flex flex-col">
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start gap-3.5 mb-3">
                  {lawyer.profilePicture ? (
                    <img src={lawyer.profilePicture} alt={lawyer.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-lg font-bold">{lawyer.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{lawyer.name}</h3>
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded mt-0.5">{lawyer.specialization}</span>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-gray-600 font-medium">{parseFloat(lawyer.rating || 0).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({lawyer.totalRatings || 0})</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500 mb-3 min-h-[1.25rem]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {lawyer.experience} yr{lawyer.experience !== 1 ? 's' : ''} exp
                  </span>
                  {lawyer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {lawyer.phone}
                    </span>
                  )}
                </div>

                <div className="min-h-[2.5rem] mb-4">
                  {lawyer.bio ? (
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{lawyer.bio}</p>
                  ) : (
                    <p className="text-sm text-gray-300">&nbsp;</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1 mt-auto">
                  <button
                    onClick={() => setSelectedLawyer(lawyer)}
                    className="flex-1 py-2 px-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    View Profile
                  </button>
                  {isAuthenticated && role === 'user' && (
                    <Link
                      href={`/lawyers/${lawyer.id}`}
                      className="flex-1 py-2 px-3 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-lg text-center transition-colors"
                    >
                      Book Now
                    </Link>
                  )}
                  {(!isAuthenticated || role !== 'user') && (
                    <div className="flex-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedLawyer(null); }}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                {selectedLawyer.profilePicture ? (
                  <img src={selectedLawyer.profilePicture} alt={selectedLawyer.name} className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-2xl font-bold">{selectedLawyer.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedLawyer.name}</h2>
                      <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded mt-1">{selectedLawyer.specialization}</span>
                    </div>
                    <button onClick={() => setSelectedLawyer(null)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">{parseFloat(selectedLawyer.rating || 0).toFixed(1)}</span>
                    <span className="text-sm text-gray-500">({selectedLawyer.totalRatings || 0} reviews)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Experience</p>
                    <p className="font-medium text-gray-900">{selectedLawyer.experience} years</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">License</p>
                    <p className="font-medium text-gray-900 text-sm truncate">{selectedLawyer.licenseNumber}</p>
                  </div>
                </div>
                {selectedLawyer.bio && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1.5">About</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedLawyer.bio}</p>
                  </div>
                )}
                {selectedLawyer.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {selectedLawyer.phone}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setSelectedLawyer(null)} className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">Close</button>
                {isAuthenticated && role === 'user' && (
                  <Link href={`/lawyers/${selectedLawyer.id}`} className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary-600 rounded-lg text-center transition-colors">Book Appointment</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </UserNav>
  );
}
