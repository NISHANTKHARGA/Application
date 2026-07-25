'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Scale, Search, CheckCircle, XCircle, Eye, FileText, LogOut, Home, Users, Calendar, UserCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function AdminLawyersPage() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedLawyer, setSelectedLawyer] = useState(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchLawyers();
  }, [isAuthenticated]);

  const fetchLawyers = async () => {
    try {
      const response = await api.get('/admin/lawyers');
      setLawyers(response.data.lawyers || []);
    } catch (error) {
      console.error('Failed to fetch lawyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveLawyer = async (lawyerId) => {
    setActionLoading(lawyerId);
    try {
      await api.put(`/admin/lawyers/approve/${lawyerId}`);
      fetchLawyers();
    } catch (error) {
      console.error('Failed to approve lawyer:', error);
    }
    setActionLoading(null);
  };

  const rejectLawyer = async (lawyerId) => {
    setActionLoading(lawyerId);
    try {
      await api.put(`/admin/lawyers/reject/${lawyerId}`, { reason: 'Application not meeting platform requirements' });
      fetchLawyers();
    } catch (error) {
      console.error('Failed to reject lawyer:', error);
    }
    setActionLoading(null);
  };

  const filteredLawyers = lawyers.filter(lawyer => {
    const matchesSearch = lawyer.name.toLowerCase().includes(search.toLowerCase()) ||
      lawyer.email.toLowerCase().includes(search.toLowerCase()) ||
      lawyer.licenseNumber?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lawyer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Lawyers', href: '/lawyers', active: true },
    { icon: UserCheck, label: 'Users', href: '/users' },
    { icon: Calendar, label: 'Appointments', href: '/appointments' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'badge-approved';
      case 'pending': return 'badge-pending';
      case 'rejected': return 'badge-rejected';
      default: return 'badge-pending';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 fixed top-0 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Scale className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-secondary">KanoonSathi</span>
              </Link>
              <span className="hidden sm:inline px-3 py-1 bg-secondary text-white text-sm rounded-full">Admin Panel</span>
            </div>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-gray-600 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-100 flex-col">
          <div className="p-6 flex-1">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`sidebar-link ${item.active ? 'sidebar-link-active' : ''}`}>
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-secondary">Lawyer Management</h1>
                <p className="text-gray-600">Manage lawyer applications and approvals</p>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-pending">{lawyers.filter(l => l.status === 'pending').length} Pending</span>
                <span className="badge badge-approved">{lawyers.filter(l => l.status === 'approved').length} Approved</span>
                <span className="badge badge-rejected">{lawyers.filter(l => l.status === 'rejected').length} Rejected</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Search by name, email, or license..." value={search}
                    onChange={(e) => setSearch(e.target.value)} className="input-field pl-12" />
                </div>
                <div className="flex gap-2">
                  {['all', 'pending', 'approved', 'rejected'].map((status) => (
                    <button key={status} onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${statusFilter === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />))}
                </div>
              </div>
            ) : filteredLawyers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-16 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No lawyers found</h3>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Lawyer</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Specialization</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">License</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Experience</th>
                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLawyers.map((lawyer) => (
                        <tr key={lawyer.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold">{lawyer.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="font-medium">{lawyer.name}</p>
                                <p className="text-sm text-gray-500">{lawyer.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-primary">{lawyer.specialization}</span></td>
                          <td className="px-6 py-4"><span className="text-gray-600">{lawyer.licenseNumber}</span></td>
                          <td className="px-6 py-4"><span className={`badge ${getStatusBadge(lawyer.status)}`}>{lawyer.status}</span></td>
                          <td className="px-6 py-4"><span className="text-gray-600">{lawyer.experience} years</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => setSelectedLawyer(lawyer)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="View Details">
                                <Eye className="w-5 h-5" />
                              </button>
                              {lawyer.status === 'pending' && (
                                <>
                                  <button onClick={() => approveLawyer(lawyer.id)} disabled={actionLoading === lawyer.id}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50" title="Approve">
                                    <CheckCircle className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => rejectLawyer(lawyer.id)} disabled={actionLoading === lawyer.id}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50" title="Reject">
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </>
                              )}
                              {lawyer.documentUrl && (
                                <button onClick={() => setSelectedLawyer(lawyer)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Document">
                                  <FileText className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedLawyer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {selectedLawyer.profilePicture ? (
                  <img src={selectedLawyer.profilePicture} alt={selectedLawyer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-bold">{selectedLawyer.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{selectedLawyer.name}</h2>
                  <span className={`badge ${getStatusBadge(selectedLawyer.status)}`}>{selectedLawyer.status}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLawyer(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="space-y-4">
              <div><h4 className="text-sm font-medium text-gray-500">Email</h4><p>{selectedLawyer.email}</p></div>
              <div><h4 className="text-sm font-medium text-gray-500">Phone</h4><p>{selectedLawyer.phone || 'N/A'}</p></div>
              <div><h4 className="text-sm font-medium text-gray-500">Specialization</h4><p>{selectedLawyer.specialization}</p></div>
              <div><h4 className="text-sm font-medium text-gray-500">License Number</h4><p>{selectedLawyer.licenseNumber}</p></div>
              <div><h4 className="text-sm font-medium text-gray-500">Experience</h4><p>{selectedLawyer.experience} years</p></div>
              {selectedLawyer.bio && (
                <div><h4 className="text-sm font-medium text-gray-500">Bio</h4><p className="text-gray-600">{selectedLawyer.bio}</p></div>
              )}
              {selectedLawyer.documentUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Uploaded License Document</h4>
                  {selectedLawyer.documentUrl.startsWith('data:image') ? (
                    <img src={selectedLawyer.documentUrl} alt="License Document"
                      className="w-full max-h-80 object-contain rounded-lg border border-gray-200" />
                  ) : selectedLawyer.documentUrl.startsWith('data:application/pdf') ? (
                    <iframe src={selectedLawyer.documentUrl} title="License Document"
                      className="w-full h-96 rounded-lg border border-gray-200" />
                  ) : (
                    <a href={selectedLawyer.documentUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium">
                      <FileText className="w-4 h-4" /> View Document
                    </a>
                  )}
                </div>
              )}
            </div>
            {selectedLawyer.status === 'pending' && (
              <div className="flex gap-3 mt-6">
                <button onClick={() => { approveLawyer(selectedLawyer.id); setSelectedLawyer(null); }}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" /> Approve
                </button>
                <button onClick={() => { rejectLawyer(selectedLawyer.id); setSelectedLawyer(null); }}
                  className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600">Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
