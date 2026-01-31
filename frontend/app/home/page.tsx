'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../../components/navbar';
import { Instrument_Sans } from 'next/font/google';
import { useRouter } from 'next/navigation';

interface Organiser {
  email: string;
  name: string;
  phone: string;
}

interface Deliverable {
  description: string;
  type: string;
}

interface Phase {
  deliverables: Deliverable[];
  description: string;
  endDate: string;
  name: string;
  startDate: string;
}

interface Prize {
  description: string;
  title: string;
}

interface Sponsor {
  name: string;
}

interface TeamMember {
  course: string;
  email: string;
  graduatingYear: string;
  institute: string;
  location: string;
  name: string;
  phone: string;
  specialization: string;
}

interface Registration {
  paymentDetails: Record<string, any>;
  teamId: string;
  teamLeader: TeamMember;
  teamMembers: TeamMember[];
  teamName: string;
  status?: string;
  submissions?: Array<{
    phaseId: number;
    score?: number;
    submissions: Record<string, string>;
  }>;
}

interface Hackathon {
  admins: string[];
  eventDescription: string;
  eventEndDate: string;
  eventName: string;
  eventStartDate: string;
  eventTagline: string;
  eventType: string;
  fee?: string;
  hackCode: string;
  hasFee: boolean;
  maxTeams: string;
  mode: string;
  organisers: Organiser[];
  phases: Phase[];
  prizes: Prize[];
  registrationEndDate: string;
  registrationStartDate: string;
  sponsors: Sponsor[];
  teamSize: string;
  upiId?: string;
  imageUrl?: string;
  registrations?: Registration[];
  announcements?: Array<{
    content: string;
    createdAt: string;
    createdBy: string | null;
    expiryDate: string;
    id: string;
    title: string;
  }>;
}

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

const LoadingSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
    <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-4"></div>
    <div className="space-y-3">
      <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      <div className="flex justify-between mt-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500">{message}</p>
  </div>
);

const HackathonCard = ({ hackathon, showRegisterButton = true }: { hackathon: Hackathon; showRegisterButton?: boolean }) => {
  const calculateDaysLeft = (registrationEndDate: string): string => {
    const now = new Date();
    const endDate = new Date(registrationEndDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
      return 'Registration Closed';
    }
    
    return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  };

  const calculatePrizePool = (prizes: Prize[]): string => {
    let total = 0;
    
    prizes.forEach(prize => {
      const numbers = prize.description.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          total += parseInt(num, 10);
        });
      }
    });
    
    return total > 0 ? `₹${total.toLocaleString()}` : 'TBA';
  };

  const getRegistrationFee = (hackathon: Hackathon): string => {
    if (hackathon.hasFee && hackathon.fee) {
      return `₹${hackathon.fee}`;
    }
    return 'Free';
  };

  const isRegistrationOpen = calculateDaysLeft(hackathon.registrationEndDate) !== 'Registration Closed';

  return (
    <div className={`${instrumentSans.className} bg-white rounded-2xl border border-gray-300 hover:border-[#008622]/20 hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col`}>
      {/* Header Image */}
      <div className="relative h-40 overflow-hidden">
        {hackathon.imageUrl ? (
          <div className="relative w-full h-full">
            <Image
              src={hackathon.imageUrl}
              alt={hackathon.eventName}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={hackathon.imageUrl.startsWith('http')}
              onError={(e) => {
                // Fallback to default if image fails to load
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '';
                target.parentElement!.innerHTML = `
                  <div class="absolute inset-0 bg-gradient-to-br from-[#008622] via-[#009d28] to-[#00b82e]">
                    <div class="absolute inset-0 bg-black/10"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <div class="text-white text-center">
                        <div class="text-3xl mb-2">🚀</div>
                        <div class="text-sm font-medium opacity-90">Hackathon</div>
                      </div>
                    </div>
                  </div>
                `;
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#008622] via-[#009d28] to-[#00b82e]">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-3xl mb-2">🚀</div>
                <div className="text-sm font-medium opacity-90">Hackathon</div>
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            hackathon.mode === 'online' 
              ? 'bg-blue-100 text-blue-700' 
              : hackathon.mode === 'offline'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {hackathon.mode.charAt(0).toUpperCase() + hackathon.mode.slice(1)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        {/* Title and Tagline */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
            {hackathon.eventName}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {hackathon.eventTagline}
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-lg font-bold text-gray-900">{hackathon.teamSize}</div>
            <div className="text-xs text-gray-500">Team Size</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <div className="text-lg font-bold text-gray-900">{getRegistrationFee(hackathon)}</div>
            <div className="text-xs text-gray-500">Registration</div>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">Prize Pool</span>
            <span className="text-lg font-bold text-yellow-900">
              {calculatePrizePool(hackathon.prizes)}
            </span>
          </div>
        </div>

        {/* Registration Status */}
        <div className="mb-4 p-3 rounded-xl border-2 border-dashed border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Registration</span>
            <span className={`text-sm font-semibold ${
              isRegistrationOpen ? 'text-[#008622]' : 'text-red-500'
            }`}>
              {calculateDaysLeft(hackathon.registrationEndDate)}
            </span>
          </div>
        </div>

        {/* Event Dates */}
        <div className="pt-4 border-t border-gray-100 mb-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{new Date(hackathon.eventStartDate).toLocaleDateString()}</span>
            <span>→</span>
            <span>{new Date(hackathon.eventEndDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto flex flex-col gap-3">
          {/* View Details Button */}
          <Link
            href={`/viewhack/${hackathon.hackCode}`}
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200 text-sm"
          >
            View Details
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function HomePageContent() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login"); // redirect to login page (adjust path if needed)
    }
  }, [router]);

  return (
    <div className={instrumentSans.className}>
      <HomePage />
    </div>
  );
}

function HomePage() {
  const [allHackathons, setAllHackathons] = useState<Hackathon[]>([]);
  const [filteredHackathons, setFilteredHackathons] = useState<Hackathon[]>([]);
  const [registeredHackathons, setRegisteredHackathons] = useState<Hackathon[]>([]);
  const [organizedHackathons, setOrganizedHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [filters, setFilters] = useState({
    mode: '',
    hasFee: '',
    teamSize: '',
    eventType: ''
  });

  // Get user email from localStorage
  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user.email) {
          setUserEmail(user.email);
        }
      }
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    fetchHackathons();
  }, []);

  useEffect(() => {
    if (allHackathons.length > 0 && userEmail) {
      categorizeHackathons();
    }
    filterHackathons();
  }, [allHackathons, searchQuery, filters, userEmail]);

  // Function to check if user is registered in a hackathon
  const isUserRegistered = (hackathon: Hackathon, email: string): boolean => {
    if (!hackathon.registrations || !email) return false;
    
    return hackathon.registrations.some(registration => {
      // Check team leader
      if (registration.teamLeader.email === email) return true;
      
      // Check team members
      return registration.teamMembers.some(member => member.email === email);
    });
  };

  // Function to check if user is an admin/organizer
  const isUserOrganizer = (hackathon: Hackathon, email: string): boolean => {
    if (!email) return false;
    return hackathon.admins.includes(email);
  };

  // Categorize hackathons based on user relationship
  const categorizeHackathons = () => {
    if (!userEmail) return;

    const registered: Hackathon[] = [];
    const organized: Hackathon[] = [];

    allHackathons.forEach(hackathon => {
      if (isUserOrganizer(hackathon, userEmail)) {
        organized.push(hackathon);
      } else if (isUserRegistered(hackathon, userEmail)) {
        registered.push(hackathon);
      }
    });

    setRegisteredHackathons(registered);
    setOrganizedHackathons(organized);
  };

  const filterHackathons = () => {
    let filtered = [...allHackathons];

    // Search by name, tagline, or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(hackathon =>
        hackathon.eventName.toLowerCase().includes(query) ||
        hackathon.eventTagline.toLowerCase().includes(query) ||
        hackathon.eventDescription.toLowerCase().includes(query) ||
        hackathon.organisers.some(org => org.name.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.mode) {
      filtered = filtered.filter(hackathon => hackathon.mode === filters.mode);
    }

    if (filters.hasFee) {
      if (filters.hasFee === 'free') {
        filtered = filtered.filter(hackathon => !hackathon.hasFee);
      } else if (filters.hasFee === 'paid') {
        filtered = filtered.filter(hackathon => hackathon.hasFee);
      }
    }

    if (filters.teamSize) {
      filtered = filtered.filter(hackathon => hackathon.teamSize === filters.teamSize);
    }

    if (filters.eventType) {
      filtered = filtered.filter(hackathon => hackathon.eventType === filters.eventType);
    }

    setFilteredHackathons(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      mode: '',
      hasFee: '',
      teamSize: '',
      eventType: ''
    });
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };

  const fetchHackathons = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'http://localhost:5000/allHacks'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch hackathons');
      }
      
      const data = await response.json();
      console.log('Fetched hackathons:', data);
      setAllHackathons(data);
      setFilteredHackathons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error && !loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchHackathons}
              className="inline-flex items-center px-6 py-3 bg-[#008622] text-white font-medium rounded-xl hover:bg-[#007020] transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={instrumentSans.className}>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#008622]/5 to-[#00b82e]/5"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Build. Compete.{' '}
                <span className="bg-gradient-to-r from-[#008622] to-[#00b82e] bg-clip-text text-transparent">
                  Innovate.
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-900 mb-8 font-medium max-w-3xl mx-auto">
                Join the most exciting hackathons and turn your ideas into reality. Connect with innovators, learn new skills, and compete for amazing prizes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="#"
                  className="inline-flex items-center px-8 py-4 bg-[#008622] text-white font-semibold rounded-xl hover:bg-[#007020] transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Explore Hackathons
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/createhack"
                  className="inline-flex items-center px-8 py-4 bg-white text-[#008622] font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 border-2 border-[#008622]"
                >
                  Organize Event
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Discover Hackathons Section */}
          <section className="mb-16">
            <div className="flex flex-col mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Discover Hackathons</h2>
                  <p className="text-gray-600 mt-2">Find your next coding adventure</p>
                </div>
              </div>

              {/* Compact Search and Filter Section */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  {/* Compact Search Bar */}
                  <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search hackathons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#008622] focus:border-[#008622] text-gray-900"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Compact Filter Button */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`inline-flex items-center px-3 py-2 border rounded-lg font-medium text-sm transition-colors ${
                        showFilters 
                          ? 'border-[#008622] bg-[#008622] text-white' 
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                      </svg>
                      Filters
                      {getActiveFilterCount() > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                          {getActiveFilterCount()}
                        </span>
                      )}
                    </button>
                    
                    {(searchQuery || getActiveFilterCount() > 0) && (
                      <button
                        onClick={clearFilters}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Filters Panel */}
                {showFilters && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Mode Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
                        <select
                          value={filters.mode}
                          onChange={(e) => setFilters({...filters, mode: e.target.value})}
                          className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-[#008622] focus:border-[#008622] hover:border-gray-400 transition-colors"
                        >
                          <option value="">All Modes</option>
                          <option value="online">Online</option>
                          <option value="offline">Offline</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>

                      {/* Fee Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Registration</label>
                        <select
                          value={filters.hasFee}
                          onChange={(e) => setFilters({...filters, hasFee: e.target.value})}
                          className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-[#008622] focus:border-[#008622] hover:border-gray-400 transition-colors"
                        >
                          <option value="">All Types</option>
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>

                      {/* Team Size Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Team Size</label>
                        <select
                          value={filters.teamSize}
                          onChange={(e) => setFilters({...filters, teamSize: e.target.value})}
                          className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-[#008622] focus:border-[#008622] hover:border-gray-400 transition-colors"
                        >
                          <option value="">Any Size</option>
                          <option value="1">Solo (1)</option>
                          <option value="2">Duo (2)</option>
                          <option value="3">Team of 3</option>
                          <option value="4">Team of 4</option>
                          <option value="5">Team of 5</option>
                          <option value="6">Team of 6+</option>
                        </select>
                      </div>

                      {/* Event Type Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Event Type</label>
                        <select
                          value={filters.eventType}
                          onChange={(e) => setFilters({...filters, eventType: e.target.value})}
                          className="w-full p-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-2 focus:ring-[#008622] focus:border-[#008622] hover:border-gray-400 transition-colors"
                        >
                          <option value="">All Types</option>
                          <option value="hackathon">Hackathon</option>
                          <option value="competition">Competition</option>
                          <option value="workshop">Workshop</option>
                          <option value="bootcamp">Bootcamp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Results Summary */}
                {(searchQuery || getActiveFilterCount() > 0) && (
                  <div className="mt-2 text-xs text-gray-600">
                    Showing {filteredHackathons.length} of {allHackathons.length} hackathons
                    {searchQuery && (
                      <span> for "<span className="font-medium">{searchQuery}</span>"</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }, (_, i) => <LoadingSkeleton key={i} />)}
              </div>
            ) : (searchQuery || getActiveFilterCount() > 0 ? filteredHackathons : allHackathons).length === 0 ? (
              <EmptyState
                title="No Hackathons Available"
                message="Check back soon for exciting new hackathons and competitions!"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(searchQuery || getActiveFilterCount() > 0 ? filteredHackathons : allHackathons).slice(0, 6).map((hackathon) => (
                  <HackathonCard key={hackathon.hackCode} hackathon={hackathon} />
                ))}
              </div>
            )}
          </section>

          {/* Your Registered Hackathons Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Your Registered Hackathons</h2>
                <p className="text-gray-600 mt-2">Track your upcoming competitions and deadlines</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 3 }, (_, i) => <LoadingSkeleton key={i} />)
              ) : registeredHackathons.length > 0 ? (
                registeredHackathons.slice(0, 3).map((hackathon) => (
                  <HackathonCard key={hackathon.hackCode} hackathon={hackathon} showRegisterButton={false} />
                ))
              ) : (
                <EmptyState
                  title="No Registered Hackathons"
                  message="You haven't registered for any hackathons yet. Explore available hackathons above!"
                />
              )}
            </div>
          </section>

          {/* Your Organized Hackathons Section */}
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Your Organized Hackathons</h2>
                <p className="text-gray-600 mt-2">Manage and monitor your events</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 3 }, (_, i) => <LoadingSkeleton key={i} />)
              ) : organizedHackathons.length > 0 ? (
                organizedHackathons.slice(0, 3).map((hackathon) => (
                  <HackathonCard key={hackathon.hackCode} hackathon={hackathon} showRegisterButton={false} />
                ))
              ) : (
                <EmptyState
                  title="No Organized Hackathons"
                  message="You haven't organized any hackathons yet. Ready to create your first event?"
                />
              )}
            </div>
          </section>
        </div>

        {/* Stats Section */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-[#008622] mb-2">500+</div>
                <div className="text-gray-600">Active Hackathons</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#008622] mb-2">10K+</div>
                <div className="text-gray-600">Participants</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#008622] mb-2">₹5Cr+</div>
                <div className="text-gray-600">Prize Money</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#008622] mb-2">100+</div>
                <div className="text-gray-600">Partner Companies</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}