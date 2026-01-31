'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/navbar';

const BASE_URL = 'http://localhost:5000';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  expiryDate: string;
}

interface Hackathon {
  hackCode: string;
  admins: string[];
  announcements?: Announcement[];
}

interface User {
  email: string;
}

export default function AdminAnnouncementsPage() {
  const params = useParams();
  const router = useRouter();
  const hackCode = params.id as string;

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAdminAndFetchData();
  }, [hackCode]);

  const checkAdminAndFetchData = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      
      if (!authToken || !userStr) {
        router.push('/');
        return;
      }

      const user: User = JSON.parse(userStr);
      
      // Fetch hackathon details
      const hackResponse = await fetch(`${BASE_URL}/fetchhack?hackCode=${hackCode}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!hackResponse.ok) {
        throw new Error('Failed to fetch hackathon');
      }

      const hackData = await hackResponse.json();
      
      // Check if user is admin
      if (!hackData.admins.includes(user.email)) {
        router.push('/');
        return;
      }

      setHackathon(hackData);
      setIsAdmin(true);
      
      // Fetch announcements
      await fetchAnnouncements();
      
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${BASE_URL}/announcements?hackCode=${hackCode}&includeExpired=true`);
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !expiryDate) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const authToken = localStorage.getItem('auth_token');
      
      const response = await fetch(`${BASE_URL}/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          hackCode,
          title: title.trim(),
          content: content.trim(),
          expiryDate: new Date(expiryDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create announcement');
      }

      // Reset form
      setTitle('');
      setContent('');
      setExpiryDate('');
      
      // Refresh announcements
      await fetchAnnouncements();
      
      alert('Announcement created successfully!');
      
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create announcement'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) <= new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Access Denied</div>
      </div>
    );
  }

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Announcements
          </h1>
          <p className="text-gray-600">
            Hackathon: <span className="font-semibold">{hackCode}</span>
          </p>
        </div>

        {/* Create Announcement Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Announcement</h2>
          
          <form onSubmit={handleCreateAnnouncement} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter announcement title"
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                id="content"
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter announcement content"
                required
              />
            </div>
SS
            <div>
              <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="datetime-local"
                id="expiryDate"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Announcement'}
            </button>
          </form>
        </div>

        {/* Existing Announcements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Existing Announcements ({announcements.length})
          </h2>
          
          {announcements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No announcements found</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`border rounded-lg p-4 ${
                    isExpired(announcement.expiryDate)
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {announcement.title}
                    </h3>
                    <div className="flex gap-2">
                      {isExpired(announcement.expiryDate) && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>Created by: {announcement.createdBy}</p>
                    <p>Created: {formatDate(announcement.createdAt)}</p>
                    <p>Expires: {formatDate(announcement.expiryDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}