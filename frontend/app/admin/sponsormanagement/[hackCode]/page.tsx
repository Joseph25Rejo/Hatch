'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Instrument_Sans } from 'next/font/google';
import Navbar from '../../../../components/navbar';
import { Plus, Edit, Trash2, Eye, EyeOff, Save, X, Youtube, ExternalLink, ArrowLeft } from 'lucide-react';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

interface SponsorShowcase {
  name: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  logo?: string;
  website?: string;
  showcase?: {
    youtubeUrl: string;
    videoId: string;
    title: string;
    description: string;
    uploadedAt: string;
    isActive?: boolean; // Make optional for backward compatibility
  };
}

interface SponsorFormData {
  sponsorName: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  logo: string;
  website: string;
  youtubeUrl: string;
  title: string;
  description: string;
}

export default function AdminSponsorManagementPage() {
  return (
    <div className={instrumentSans.className}>
      <AdminSponsorManagementContent />
    </div>
  );
}

function AdminSponsorManagementContent() {
  const params = useParams();
  const hackCode = params?.hackCode as string;
  const [sponsors, setSponsors] = useState<SponsorShowcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<string | null>(null);
  const [formData, setFormData] = useState<SponsorFormData>({
    sponsorName: '',
    tier: 'bronze',
    logo: '',
    website: '',
    youtubeUrl: '',
    title: '',
    description: ''
  });

  // Azure backend base URL
  const baseURL = 'https://thecodeworks.in/hatch';

  useEffect(() => {
    fetchSponsors();
  }, [hackCode]);

  const fetchSponsors = async () => {
    if (!hackCode) return;

    try {
      const authToken = localStorage.getItem('auth_token');
      
      // For admin panel, we want to see ALL sponsors (active and inactive)
      const response = await fetch(`${baseURL}/sponsor-showcase?hackCode=${hackCode}&activeOnly=false`, {
        headers: {
          ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch sponsors');
      }

      const data = await response.json();
      console.log('Fetched sponsors data:', data); // Debug log to see what we're getting
      console.log('Individual sponsors:', data.showcases?.map((s: any) => ({ 
        name: s.name, 
        isActive: s.showcase?.isActive,
        showcase: s.showcase 
      }))); // Debug individual sponsor status
      setSponsors(data.showcases || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const requestBody = {
        hackCode,
        sponsorName: formData.sponsorName,
        youtubeUrl: formData.youtubeUrl,
        title: formData.title,
        description: formData.description,
        tier: formData.tier,
        logo: formData.logo,
        website: formData.website
      };
      
      console.log('Submitting sponsor showcase:', requestBody);

      const response = await fetch(`${baseURL}/sponsor-showcase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response status:', response.status);
        console.log('Error response text:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText} - ${errorText}` };
        }
        throw new Error(errorData.message || 'Failed to save sponsor showcase');
      }

      console.log('Sponsor showcase saved successfully!');
      const responseData = await response.json();
      console.log('Response data:', responseData);

      // Reset form and refresh data
      setFormData({
        sponsorName: '',
        tier: 'bronze',
        logo: '',
        website: '',
        youtubeUrl: '',
        title: '',
        description: ''
      });
      setShowForm(false);
      setEditingSponsor(null);
      await fetchSponsors();
      
      // Show success message
      alert(editingSponsor ? 'Sponsor showcase updated successfully!' : 'Sponsor showcase created successfully!');
      
    } catch (error) {
      console.error('Error saving sponsor showcase:', error);
      alert(error instanceof Error ? error.message : 'Failed to save sponsor showcase');
    }
  };

  const handleEdit = (sponsor: SponsorShowcase) => {
    setFormData({
      sponsorName: sponsor.name,
      tier: sponsor.tier,
      logo: sponsor.logo || '',
      website: sponsor.website || '',
      youtubeUrl: sponsor.showcase?.youtubeUrl || '',
      title: sponsor.showcase?.title || '',
      description: sponsor.showcase?.description || ''
    });
    setEditingSponsor(sponsor.name);
    setShowForm(true);
  };

  const handleDelete = async (sponsorName: string) => {
    if (!confirm(`Are you sure you want to remove ${sponsorName}'s showcase?`)) {
      return;
    }

    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch(`${baseURL}/sponsor-showcase/${encodeURIComponent(sponsorName)}?hackCode=${hackCode}&action=remove`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || 'Failed to delete sponsor showcase');
      }

      await fetchSponsors();
      alert('Sponsor showcase deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting sponsor showcase:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete sponsor showcase');
    }
  };

  const toggleActive = async (sponsorName: string, isActive: boolean) => {
    console.log(`toggleActive called with: sponsorName="${sponsorName}", isActive=${isActive}`);
    console.log('Current sponsors array:', sponsors);
    console.log('Looking for sponsor with name:', sponsorName);
    
    const foundSponsor = sponsors.find(s => s.name === sponsorName);
    console.log('Found sponsor:', foundSponsor);
    
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // For undefined or true isActive values, we should deactivate
      if (isActive === true) {
        // If currently active, deactivate it using DELETE endpoint
        console.log('Deactivating sponsor:', sponsorName);
        console.log('hackCode:', hackCode);
        console.log('Full URL:', `${baseURL}/sponsor-showcase/${encodeURIComponent(sponsorName)}?hackCode=${hackCode}&action=deactivate`);
        
        const response = await fetch(`${baseURL}/sponsor-showcase/${encodeURIComponent(sponsorName)}?hackCode=${hackCode}&action=deactivate`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        console.log('Deactivate response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Deactivate error response:', errorText);
          console.log('Response headers:', Object.fromEntries(response.headers.entries()));
          let errorData;
          try {
            errorData = JSON.parse(errorText);
            console.log('Parsed error data:', errorData);
          } catch (parseError) {
            console.log('Failed to parse error response as JSON:', parseError);
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          throw new Error(errorData.message || 'Failed to deactivate sponsor showcase');
        }
        
        alert('Sponsor showcase hidden successfully!');
      } else {
        // If currently inactive (isActive === false), reactivate it using POST endpoint
        console.log('Activating sponsor:', sponsorName);
        
        const sponsor = sponsors.find(s => s.name === sponsorName);
        if (!sponsor || !sponsor.showcase) {
          throw new Error('Sponsor or showcase not found');
        }

        const requestBody = {
          hackCode,
          sponsorName: sponsor.name,
          youtubeUrl: sponsor.showcase.youtubeUrl,
          title: sponsor.showcase.title,
          description: sponsor.showcase.description,
          tier: sponsor.tier,
          logo: sponsor.logo || '',
          website: sponsor.website || '',
        };
        
        console.log('Activation request body:', requestBody);

        const response = await fetch(`${baseURL}/sponsor-showcase`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('Activate response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('Activate error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
          }
          throw new Error(errorData.message || 'Failed to activate sponsor showcase');
        }
        
        alert('Sponsor showcase activated successfully!');
      }

      // Refresh the sponsors list
      console.log('Refreshing sponsors list...');
      await fetchSponsors();
      
    } catch (error) {
      console.error('Error toggling sponsor showcase:', error);
      alert(error instanceof Error ? error.message : 'Failed to update sponsor showcase');
    }
  };

  const tierColors = {
    platinum: 'from-gray-800 to-black text-white',
    gold: 'from-yellow-400 to-yellow-600 text-black',
    silver: 'from-gray-300 to-gray-500 text-black',
    bronze: 'from-orange-400 to-orange-600 text-white'
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sponsors...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Management
            </button>
          </div>

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sponsor Showcase Management</h1>
              <p className="text-gray-600">Manage partner showcases and videos for hackathon: {hackCode}</p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingSponsor(null);
                setFormData({
                  sponsorName: '',
                  tier: 'bronze',
                  logo: '',
                  website: '',
                  youtubeUrl: '',
                  title: '',
                  description: ''
                });
              }}
              className="bg-[#008622] text-white px-6 py-2 rounded-lg hover:bg-[#006b1b] flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sponsor Showcase
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto shadow-2xl border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingSponsor ? 'Edit Sponsor Showcase' : 'Add New Sponsor Showcase'}
                    </h2>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-1 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor Name *</label>
                      <input
                        type="text"
                        value={formData.sponsorName}
                        onChange={(e) => setFormData({...formData, sponsorName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008622] focus:border-[#008622] text-gray-900 bg-white"
                        placeholder="Company Name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({...formData, tier: e.target.value as 'platinum' | 'gold' | 'silver' | 'bronze'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008622] focus:border-[#008622] text-gray-900 bg-white"
                      >
                        <option value="bronze">Bronze</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                      <input
                        type="url"
                        value={formData.logo}
                        onChange={(e) => setFormData({...formData, logo: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008622] focus:border-[#008622] text-gray-900 bg-white"
                        placeholder="https://company.com/logo.png"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#008622] focus:border-[#008622] text-gray-900 bg-white"
                        placeholder="https://company.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">YouTube Video URL *</label>
                    <input
                      type="url"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Showcase Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Welcome Message from [Company]"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of the showcase"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#008622] text-white rounded-lg hover:bg-[#006b1b] flex items-center transition-colors font-medium shadow-sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {editingSponsor ? 'Update Showcase' : 'Save Showcase'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Sponsors Grid */}
          {sponsors.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Sponsor Showcases</h3>
              <p className="text-gray-600">Add your first sponsor showcase to get started.</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              sponsors.length === 1 
                ? 'grid-cols-1 max-w-md mx-auto'
                : sponsors.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
                : sponsors.length === 3
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {sponsors.map((sponsor, index) => (
                <div key={index} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 ${
                  sponsors.length === 1 ? 'transform scale-105' : ''
                }`}>
                  <div className={`bg-gradient-to-r ${tierColors[sponsor.tier]} p-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold">{sponsor.name}</h3>
                        <span className="text-sm opacity-90 uppercase">{sponsor.tier}</span>
                      </div>
                      {sponsor.logo && (
                        <img src={sponsor.logo} alt={sponsor.name} className="w-10 h-10 object-contain bg-white rounded p-1" />
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {sponsor.showcase && (
                      <>
                        <h4 className="font-semibold text-gray-900 mb-2">{sponsor.showcase.title}</h4>
                        {sponsor.showcase.description && (
                          <p className="text-sm text-gray-600 mb-3">{sponsor.showcase.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                          <span>
                            Status: {(sponsor.showcase.isActive ?? true) ? 
                              <span className="text-green-600">Active</span> : 
                              <span className="text-red-600">Inactive</span>
                            }
                          </span>
                          <span>{new Date(sponsor.showcase.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleEdit(sponsor)}
                        className="flex-1 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200 flex items-center justify-center"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>
                      
                      {sponsor.showcase && (
                        <button
                          onClick={() => {
                            // Handle undefined isActive - treat undefined as true (active) since it shows as Active in UI
                            const actualIsActive = sponsor.showcase!.isActive;
                            const isCurrentlyActive = actualIsActive === true; // explicitly check for true
                            console.log(`Toggling sponsor ${sponsor.name}, actual isActive:`, actualIsActive, 'treating as active:', isCurrentlyActive);
                            toggleActive(sponsor.name, isCurrentlyActive);
                          }}
                          className={`flex-1 px-3 py-1 rounded text-sm flex items-center justify-center ${
                            (sponsor.showcase.isActive ?? true)
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {(sponsor.showcase.isActive ?? true) ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                          {(sponsor.showcase.isActive ?? true) ? 'Hide' : 'Show'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(sponsor.name)}
                        className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      
                      {sponsor.showcase && (
                        <a
                          href={sponsor.showcase.youtubeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-red-100 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-200 flex items-center justify-center"
                        >
                          <Youtube className="w-3 h-3" />
                        </a>
                      )}
                      
                      {sponsor.website && (
                        <a
                          href={sponsor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center justify-center"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}