'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from "next/link";
import Navbar from '../../../components/navbar';

interface Organiser {
  name: string;
  email: string;
  phone: string;
}

interface Phase {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  deliverables: {
    type: string;
    description: string;
  }[];
}

interface Prize {
  title: string;
  description: string;
}

interface Sponsor {
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiryDate: string;
  createdBy: string | null;
}

interface PhaseScore {
  phaseId: number;
  phaseName: string;
  score: number;
}

interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  memberCount: number;
  totalScore: number;
  phaseScores: PhaseScore[];
}

interface Results {
  eventName: string;
  hackCode: string;
  leaderboard: LeaderboardEntry[];
  publishedAt: string;
  publishedBy: string;
  totalTeams: number;
}

interface HackathonData {
  admins: string[];
  eventDescription: string;
  eventEndDate: string;
  eventName: string;
  eventStartDate: string;
  eventTagline: string;
  eventType: string;
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
  imageUrl?: string;
  announcements?: Announcement[];
  registrations?: any[];
  results?: Results;
}

interface HackathonStatus {
  phase: 'upcoming' | 'registration' | 'active' | 'ended';
  message: string;
  canRegister: boolean;
  daysRemaining?: number;
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

interface TeamDetails {
  paymentDetails: any;
  teamId: string;
  teamLeader: TeamMember;
  teamMembers: TeamMember[];
  teamName: string;
}

// Leaderboard Component
function LeaderboardSection({ results }: { results: Results }) {
  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2: return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3: return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const formatPublishedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🏆 Leaderboard</h2>
        <div className="text-sm text-gray-600">
          <div>Published: {formatPublishedDate(results.publishedAt)}</div>
          <div>Total Teams: {results.totalTeams}</div>
        </div>
      </div>

      <div className="space-y-4">
        {results.leaderboard.map((team, index) => (
          <div
            key={team.teamId}
            className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
              team.rank <= 3 ? 'border-2 border-opacity-50' : 'border-gray-200'
            } ${
              team.rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300' :
              team.rank === 2 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300' :
              team.rank === 3 ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300' :
              'bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${getRankBadgeColor(team.rank)}`}>
                  {team.rank <= 3 ? getRankIcon(team.rank) : team.rank}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{team.teamName}</h3>
                  <p className="text-sm text-gray-600">{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{team.totalScore}</div>
                <div className="text-sm text-gray-600">points</div>
              </div>
            </div>

            {/* Phase Breakdown */}
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Phase Scores:</h4>
              <div className="flex flex-wrap gap-2">
                {team.phaseScores.map((phase) => (
                  <div
                    key={phase.phaseId}
                    className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    <span className="font-medium">{phase.phaseName}:</span>{' '}
                    <span className="text-gray-900 font-semibold">{phase.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {results.publishedBy && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Results published by: <span className="font-medium">{results.publishedBy}</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Status calculation component
function HackathonStatusCard({ data }: { data: HackathonData }) {
  const calculateStatus = (): HackathonStatus => {
    const now = new Date();
    const regStart = new Date(data.registrationStartDate);
    const regEnd = new Date(data.registrationEndDate);
    const eventStart = new Date(data.eventStartDate);
    const eventEnd = new Date(data.eventEndDate);

    if (now < regStart) {
      const daysUntilReg = Math.ceil((regStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        phase: 'upcoming',
        message: `Registration opens in ${daysUntilReg} day${daysUntilReg !== 1 ? 's' : ''}`,
        canRegister: false,
        daysRemaining: daysUntilReg
      };
    }

    if (now >= regStart && now <= regEnd) {
      const daysLeft = Math.ceil((regEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        phase: 'registration',
        message: `Registration closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        canRegister: true,
        daysRemaining: daysLeft
      };
    }

    if (now > regEnd && now < eventStart) {
      const daysUntilEvent = Math.ceil((eventStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        phase: 'upcoming',
        message: `Event starts in ${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''}`,
        canRegister: false,
        daysRemaining: daysUntilEvent
      };
    }

    if (now >= eventStart && now <= eventEnd) {
      const daysLeft = Math.ceil((eventEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        phase: 'active',
        message: `Competition ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
        canRegister: false,
        daysRemaining: daysLeft
      };
    }

    return {
      phase: 'ended',
      message: 'This hackathon has ended',
      canRegister: false
    };
  };

  const status = calculateStatus();

  const getStatusColor = () => {
    switch (status.phase) {
      case 'registration': return 'bg-green-100 text-green-800 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'upcoming': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg capitalize">{status.phase} Phase</h3>
          <p className="text-sm opacity-90">{status.message}</p>
        </div>
        {status.daysRemaining && (
          <div className="text-right">
            <div className="text-2xl font-bold">{status.daysRemaining}</div>
            <div className="text-xs opacity-75">days</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Team Details Popup Component
function TeamDetailsPopup({ 
  teamDetails, 
  userEmail, 
  onClose, 
  onLeaveTeam 
}: { 
  teamDetails: TeamDetails; 
  userEmail: string;
  onClose: () => void;
  onLeaveTeam: () => void;
}) {
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);

  const handleLeaveTeam = async () => {
    if (window.confirm('Are you sure you want to leave this team? This action cannot be undone.')) {
      setIsLeavingTeam(true);
      await onLeaveTeam();
      setIsLeavingTeam(false);
    }
  };

  const renderMemberCard = (member: TeamMember, isLeader: boolean = false) => {
    const isCurrentUser = member.email === userEmail;
    
    return (
      <div className={`${isLeader ? 'bg-blue-50' : 'bg-green-50'} rounded-lg p-4`}>
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-medium text-gray-900">
            {isLeader ? 'Team Leader' : `Member`}
            {isCurrentUser && (
              <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                You
              </span>
            )}
          </h4>
          {isCurrentUser && !isLeader && (
            <button
              onClick={handleLeaveTeam}
              disabled={isLeavingTeam}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm rounded-md transition-colors"
            >
              {isLeavingTeam ? 'Leaving...' : 'Leave Team'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium text-gray-900">{member.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{member.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium text-gray-900">{member.phone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Institute</p>
            <p className="font-medium text-gray-900">{member.institute}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Course</p>
            <p className="font-medium text-gray-900">{member.course}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Graduating Year</p>
            <p className="font-medium text-gray-900">{member.graduatingYear}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="font-medium text-gray-900">{member.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Specialization</p>
            <p className="font-medium text-gray-900">{member.specialization}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white bg-opacity-10 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Team Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Team Name and ID */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Team Name</p>
                <p className="font-medium text-gray-900 text-xl">{teamDetails.teamName}</p>
                <p className="text-sm text-gray-600 mt-2">Team ID</p>
                <p className="font-mono text-sm text-gray-900">{teamDetails.teamId}</p>
              </div>
            </div>

            {/* Team Leader */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Team Leader</h3>
              {renderMemberCard(teamDetails.teamLeader, true)}
            </div>

            {/* Team Members */}
            {teamDetails.teamMembers && teamDetails.teamMembers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Team Members ({teamDetails.teamMembers.length})
                </h3>
                <div className="space-y-4">
                  {teamDetails.teamMembers.map((member, index) => (
                    <div key={index}>
                      {renderMemberCard(member)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action button component
function ActionButton({ data }: { data: HackathonData }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<'loading' | 'yes' | 'no' | 'error'>('loading');
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);
  const [showTeamPopup, setShowTeamPopup] = useState(false);
  const params = useParams();
  const hackCode = params.id as string;

  useEffect(() => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('auth_token');
    
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserEmail(userData.email);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    if (token) {
      setAuthToken(token);
    }
  }, []);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!userEmail || !authToken || !hackCode) return;

      try {
        const response = await fetch(
          'http://localhost:5000/getTeamDetails',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hackCode: hackCode,
              email: userEmail
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRegistrationStatus(data.registrationStatus);
          if (data.registrationStatus === 'yes' && data.team) {
            setTeamDetails(data.team);
          }
        } else {
          setRegistrationStatus('no');
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        setRegistrationStatus('error');
      }
    };

    checkRegistrationStatus();
  }, [userEmail, authToken, hackCode]);

  const handleLeaveTeam = async () => {
    if (!userEmail || !authToken || !hackCode) return;

    try {
      const response = await fetch(
        'http://localhost:5000/leaveTeam',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hackCode: hackCode,
            email: userEmail
          })
        }
      );

      if (response.ok) {
        // Reset states after successful leave
        setRegistrationStatus('no');
        setTeamDetails(null);
        setShowTeamPopup(false);
        alert('Successfully left the team!');
      } else {
        const errorData = await response.json();
        alert(`Failed to leave team: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error leaving team:', error);
      alert('An error occurred while leaving the team. Please try again.');
    }
  };

  const isAdmin = userEmail && data.admins.includes(userEmail);
  const now = new Date();
  const regStart = new Date(data.registrationStartDate);
  const regEnd = new Date(data.registrationEndDate);
  const canRegister = now >= regStart && now <= regEnd;

  // Admin view
  if (isAdmin) {
    return (
      <Link href={`/managehack/${hackCode}`}>
        <button className="w-full bg-[#008622] hover:bg-[#006b1b] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
          Manage Hackathon
        </button>
      </Link>
    );
  }

  // Loading state
  if (registrationStatus === 'loading') {
    return (
      <button 
        disabled 
        className="w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
      >
        Checking Status...
      </button>
    );
  }

  // Already registered - show team details
if (registrationStatus === 'yes' && teamDetails && userEmail) {
  return (
    <>
      <button 
        onClick={() => setShowTeamPopup(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
      >
        View Team Details
      </button>
      <Link href={`/arena/${hackCode}`}>
        <button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
          Go to Submission
        </button>
      </Link>
      {showTeamPopup && (
        <TeamDetailsPopup 
          teamDetails={teamDetails} 
          userEmail={userEmail}
          onClose={() => setShowTeamPopup(false)}
          onLeaveTeam={handleLeaveTeam}
        />
      )}
    </>
  );
}

  // Can register
  if (canRegister && registrationStatus === 'no') {
    return (
      <Link href={`/registerhack/${hackCode}`}>
        <button className="w-full bg-[#008622] hover:bg-[#006b1b] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
          Register Now
        </button>
      </Link>
    );
  }

  // Registration closed
  return (
    <button 
      disabled 
      className="w-full bg-gray-300 text-gray-500 font-semibold py-3 px-6 rounded-lg cursor-not-allowed"
    >
      Registration Closed
    </button>
  );
}

export default function HackathonPage() {
  const params = useParams();
  const [hackData, setHackData] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHackathon = async () => {
      try {
        const hackCode = params.id as string;
        const response = await fetch(
          `http://localhost:5000/fetchhack?hackCode=${hackCode}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch hackathon data');
        }
        
        const data = await response.json();
        setHackData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchHackathon();
    }
  }, [params.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#008622]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Hackathon</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!hackData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Hackathon Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Banner Image */}
        <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
          <img 
            src={hackData.imageUrl || '/logo.svg'} 
            alt={hackData.eventName}
            className="w-full h-48 object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/logo.svg';
            }}
          />
        </div>
        
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{hackData.eventName}</h1>
              <p className="text-xl text-gray-600 mb-4">{hackData.eventTagline}</p>
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-[#008622] text-white text-sm font-medium rounded-full">
                  {hackData.eventType}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full capitalize">
                  {hackData.mode}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Max {hackData.maxTeams} teams
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                  Team size: {hackData.teamSize}
                </span>
                {!hackData.hasFee && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Free Entry
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <HackathonStatusCard data={hackData} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Leaderboard Section - Only show if results are available */}
            {hackData.results && (
              <LeaderboardSection results={hackData.results} />
            )}

            {/* Announcements */}
            {hackData.announcements && hackData.announcements.filter(announcement => {
              const now = new Date();
              const expiryDate = new Date(announcement.expiryDate);
              return expiryDate > now;
            }).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">📢 Announcements</h2>
                <div className="space-y-4">
                  {hackData.announcements
                    .filter(announcement => {
                      const now = new Date();
                      const expiryDate = new Date(announcement.expiryDate);
                      return expiryDate > now;
                    })
                    .map((announcement, index) => (
                      <div key={announcement.id} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-r-lg">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                        <p className="text-gray-700 mb-2">{announcement.content}</p>
                        <div className="text-sm text-gray-600">
                          <span>Posted: {new Date(announcement.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          <span className="ml-4">Expires: {new Date(announcement.expiryDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">{hackData.eventDescription}</p>
            </div>

            {/* Phases */}
            {hackData.phases && hackData.phases.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Competition Phases</h2>
                <div className="space-y-4">
                  {hackData.phases.map((phase, index) => (
                    <div key={index} className="border-l-4 border-[#008622] pl-4 py-2">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{phase.name}</h3>
                      <p className="text-gray-700 mb-3">{phase.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span><strong>Start:</strong> {formatDate(phase.startDate)}</span>
                        <span><strong>End:</strong> {formatDate(phase.endDate)}</span>
                      </div>
                      {phase.deliverables && phase.deliverables.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Deliverables:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {phase.deliverables.map((deliverable, idx) => (
                              <li key={idx} className="text-gray-700">
                                <span className="font-medium capitalize">{deliverable.type}:</span> {deliverable.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes */}
            {hackData.prizes && hackData.prizes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Prizes & Rewards</h2>
                <div className="grid gap-4">
                  {hackData.prizes.map((prize, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{prize.title}</h3>
                      <p className="text-gray-700">{prize.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsors */}
            {hackData.sponsors && hackData.sponsors.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Sponsors & Partners</h2>
                  <Link href={`/sponsorshowcase/${hackData.hackCode}`}>
                    <button className="bg-[#008622] text-white px-4 py-2 rounded-lg hover:bg-[#006b1b] transition-colors text-sm font-medium flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      View Showcases
                    </button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-3">
                  {hackData.sponsors.map((sponsor, index) => (
                    <span key={index} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg font-medium">
                      {sponsor.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Click "View Showcases" to watch video messages from our partners!
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Registration Action */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <ActionButton data={hackData} />
            </div>

            {/* Important Dates */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Important Dates</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Registration Opens</h3>
                  <p className="text-sm text-gray-600">{formatDate(hackData.registrationStartDate)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Registration Closes</h3>
                  <p className="text-sm text-gray-600">{formatDate(hackData.registrationEndDate)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Event Start</h3>
                  <p className="text-sm text-gray-600">{formatDate(hackData.eventStartDate)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Event End</h3>
                  <p className="text-sm text-gray-600">{formatDate(hackData.eventEndDate)}</p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Event Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Code:</span>
                  <span className="font-mono font-medium text-gray-900">{hackData.hackCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mode:</span>
                  <span className="font-medium capitalize text-gray-900">{hackData.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Team Size:</span>
                  <span className="font-medium text-gray-900">{hackData.teamSize} members</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Registered Teams:</span>
                  <span className="font-medium text-gray-900">
                    {hackData.registrations ? hackData.registrations.length : 0} / {hackData.maxTeams}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Teams:</span>
                  <span className="font-medium text-gray-900">{hackData.maxTeams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entry Fee:</span>
                  <span className="font-medium text-gray-900">{hackData.hasFee ? 'Paid' : 'Free'}</span>
                </div>
              </div>
            </div>

            {/* Organisers */}
            {hackData.organisers && hackData.organisers.some(org => org.name || org.email) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Organisers</h2>
                <div className="space-y-3">
                  {hackData.organisers.filter(org => org.name || org.email).map((organiser, index) => (
                    <div key={index} className="pb-3 border-b border-gray-200 last:border-b-0">
                      {organiser.name && <p className="font-medium text-gray-900">{organiser.name}</p>}
                      {organiser.email && <p className="text-sm text-gray-600">{organiser.email}</p>}
                      {organiser.phone && <p className="text-sm text-gray-600">{organiser.phone}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}