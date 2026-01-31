'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Instrument_Sans } from 'next/font/google';
import Navbar from '../../../components/navbar';
import { Play, ExternalLink, Globe, Award, Clock, Users, ArrowLeft } from 'lucide-react';

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
  showcase: {
    youtubeUrl: string;
    videoId: string;
    title: string;
    description: string;
    uploadedAt: string;
    isActive?: boolean; // Make optional for backward compatibility
  };
}

interface ShowcaseData {
  hackCode: string;
  eventName: string;
  showcases: SponsorShowcase[];
  total: number;
}

const tierColors = {
  platinum: 'from-gray-800 to-black text-white',
  gold: 'from-yellow-400 to-yellow-600 text-black',
  silver: 'from-gray-300 to-gray-500 text-black',
  bronze: 'from-orange-400 to-orange-600 text-white'
};

const tierIcons = {
  platinum: '💎',
  gold: '🏆',
  silver: '🥈',
  bronze: '🥉'
};

export default function SponsorShowcasePage() {
  return (
    <div className={instrumentSans.className}>
      <SponsorShowcaseContent />
    </div>
  );
}

function SponsorShowcaseContent() {
  const params = useParams();
  const hackCode = params?.hackCode as string;
  const [showcaseData, setShowcaseData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  // Azure backend base URL
  const baseURL = 'http://localhost:5000';

  useEffect(() => {
    const fetchShowcases = async () => {
      if (!hackCode) return;

      try {
        // Fetch all showcases first, then filter on frontend for better control
        const response = await fetch(`${baseURL}/sponsor-showcase?hackCode=${hackCode}&activeOnly=false`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch sponsor showcases');
        }

        const data = await response.json();
        
        // Filter for active showcases on frontend with fallback for undefined isActive
        if (data && data.showcases) {
          const activeShowcases = data.showcases.filter((showcase: SponsorShowcase) => {
            // Use nullish coalescing to default undefined isActive to true
            return (showcase.showcase?.isActive ?? true) === true;
          });
          
          setShowcaseData({
            ...data,
            showcases: activeShowcases,
            total: activeShowcases.length
          });
        } else {
          setShowcaseData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load showcases');
      } finally {
        setLoading(false);
      }
    };

    fetchShowcases();
  }, [hackCode]);

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url: string) => {
    const videoId = extractVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const getThumbnailUrl = (url: string) => {
    const videoId = extractVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sponsor showcases...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Showcases</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!showcaseData || showcaseData.showcases.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Sponsor Showcases</h1>
            <p className="text-gray-600">There are no sponsor showcases available for this hackathon yet.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => window.history.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Hackathon
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🤝 Partner Showcases
            </h1>
            <h2 className="text-2xl text-[#008622] font-semibold mb-2">
              {showcaseData.eventName}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our amazing partners and their messages for this hackathon. 
              Watch their showcase videos to learn more about their involvement and support.
            </p>
            <div className="flex items-center justify-center mt-4 space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {showcaseData.total} Partners
              </div>
              <div className="flex items-center">
                <Play className="w-4 h-4 mr-1" />
                Video Showcases
              </div>
            </div>
          </div>

          {/* Video Modal */}
          {selectedVideo && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Video Showcase</h3>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                  >
                    ×
                  </button>
                </div>
                <div className="aspect-video">
                  <iframe
                    src={`${getEmbedUrl(selectedVideo)}?autoplay=1&controls=1&modestbranding=1&rel=0`}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title="Sponsor showcase video"
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            </div>
          )}

          {/* Showcases Grid */}
          <div className={`grid gap-8 ${
            showcaseData.showcases.length === 1 
              ? 'grid-cols-1 max-w-2xl mx-auto'
              : showcaseData.showcases.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : showcaseData.showcases.length === 3
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {showcaseData.showcases.map((sponsor, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                showcaseData.showcases.length === 1 ? 'transform scale-105' : ''
              }`}>
                {/* Sponsor Header */}
                <div className={`bg-gradient-to-r ${tierColors[sponsor.tier]} p-6`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{tierIcons[sponsor.tier]}</span>
                        <span className="text-sm font-medium uppercase tracking-wide opacity-90">
                          {sponsor.tier} Sponsor
                        </span>
                      </div>
                      <h3 className="text-xl font-bold">{sponsor.name}</h3>
                    </div>
                    {sponsor.logo && (
                      <img 
                        src={sponsor.logo} 
                        alt={`${sponsor.name} logo`} 
                        className="w-12 h-12 object-contain bg-white rounded-lg p-1"
                      />
                    )}
                  </div>
                </div>

                {/* Video Thumbnail */}
                <div className="relative group">
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {getThumbnailUrl(sponsor.showcase.youtubeUrl) ? (
                      <img
                        src={getThumbnailUrl(sponsor.showcase.youtubeUrl) || ''}
                        alt={`${sponsor.name} video thumbnail`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to iframe if thumbnail fails
                          const target = e.target as HTMLImageElement;
                          const iframe = document.createElement('iframe');
                          iframe.src = `${getEmbedUrl(sponsor.showcase.youtubeUrl)}?autoplay=0&controls=0&showinfo=0&modestbranding=1`;
                          iframe.className = 'w-full h-full pointer-events-none';
                          iframe.frameBorder = '0';
                          target.parentNode?.replaceChild(iframe, target);
                        }}
                      />
                    ) : (
                      <iframe
                        src={`${getEmbedUrl(sponsor.showcase.youtubeUrl)}?autoplay=0&controls=0&showinfo=0&modestbranding=1`}
                        className="w-full h-full pointer-events-none"
                        frameBorder="0"
                        title={`${sponsor.name} showcase video`}
                      ></iframe>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => setSelectedVideo(sponsor.showcase.youtubeUrl)}
                      className="bg-white text-[#008622] p-4 rounded-full hover:bg-gray-50 transition-colors shadow-lg"
                    >
                      <Play className="w-8 h-8" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {sponsor.showcase.title}
                  </h4>
                  {sponsor.showcase.description && (
                    <p className="text-gray-600 text-sm mb-4">
                      {sponsor.showcase.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(sponsor.showcase.uploadedAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedVideo(sponsor.showcase.youtubeUrl)}
                      className="flex-1 bg-[#008622] text-white px-4 py-2 rounded-lg hover:bg-[#006b1b] transition-colors flex items-center justify-center font-medium"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Watch Video
                    </button>
                    {sponsor.website && (
                      <a
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-16 py-8 border-t border-gray-200">
            <p className="text-gray-600">
              Thank you to all our amazing partners for supporting this hackathon! 🙏
            </p>
          </div>
        </div>
      </div>
    </>
  );
}