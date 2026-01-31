'use client';

import { useEffect, useState } from 'react';
import { Instrument_Sans } from 'next/font/google';
import Navbar from '../../../components/navbar';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});
import { useParams, useRouter } from 'next/navigation';

const BASE_URL = "http://localhost:5000";

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

interface Member {
  name?: string;
  email?: string;
  phone?: string;
  course?: string;
  graduatingYear?: string;
  institute?: string;
  location?: string;
  specialization?: string;
}

interface SubmissionDeliverable {
  [key: string]: string; // This allows dynamic keys like "presentation", "mvp", etc.
}

interface Submission {
  phaseId: number;
  submittedAt?: string;
  submissions?: SubmissionDeliverable;
  score?: number; // Score is directly in the submission object
}

interface Registration {
  teamId: string;
  teamName?: string;
  teamLeader?: Member;
  teamMembers?: Member[];
  submissions?: Submission[];
  paymentDetails?: any;
}

interface HackathonData {
  admins: string[];
  eventDescription: string;
  eventEndDate: string;
  eventName: string;
  eventStartDate: string;
  eventTagline: string;
  eventType: string;
  fee: string;
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
  upiId: string;
  registrations?: Registration[];
}

type TabType = 'overview' | 'details' | 'phases' | 'admins' | 'announcements' | 'scoring';

export default function ManageHackPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login"); // redirect to login page (adjust path if needed)
    }
  }, [router]);

  return (
    <div className={instrumentSans.className}>
      <ManageHackPageContent />
    </div>
  );
}


function ManageHackPageContent() {
  const params = useParams();
  const router = useRouter();
  const hackCode = params.id as string;

  const [hackData, setHackData] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editedData, setEditedData] = useState<Partial<HackathonData>>({});
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Judging state
  const [activePhaseId, setActivePhaseId] = useState<string>('');
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const [scoreInputs, setScoreInputs] = useState<Record<string, Record<string, string>>>({});
  const [scoreSaving, setScoreSaving] = useState<Record<string, boolean>>({});

  // In-memory auth token storage (replace with your actual auth mechanism)
  const [authToken, setAuthToken] = useState<string>('');

  // Get auth token - implement your actual auth logic here
  const getAuthToken = () => {
    // For now, return empty string or implement proper auth
    // You might want to get this from context, props, or cookies
    return localStorage.getItem('auth_token');
  };

  const fetchHackathonData = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${BASE_URL}/fetchhack?hackCode=${hackCode}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch hackathon data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched hackathon data:', data); // Debug log

      setHackData(data);
      setEditedData(data);
      setError(null);

      // Set default active phase for judging
      if (data.phases && data.phases.length > 0 && !activePhaseId) {
        setActivePhaseId(data.phases[0].name);
      }
    } catch (err) {
      console.error('Error fetching hackathon data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch hackathon data');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();

      const response = await fetch(`${BASE_URL}/managehack`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hackCode,
          action: 'update',
          updateFields: editedData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save changes: ${response.status} ${response.statusText}`);
      }

      alert('Changes saved successfully!');
      await fetchHackathonData(); // Refresh data
    } catch (err) {
      console.error('Error saving changes:', err);
      alert(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail.trim()) {
      alert('Please enter a valid email address');
      return;
    }

    try {
      setAdminLoading(true);
      const token = getAuthToken();

      const response = await fetch(`${BASE_URL}/managehack`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hackCode,
          action: 'add_admin',
          adminEmail: newAdminEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add admin: ${response.status} ${response.statusText}`);
      }

      alert('Admin added successfully!');
      setNewAdminEmail('');
      await fetchHackathonData(); // Refresh data
    } catch (err) {
      console.error('Error adding admin:', err);
      alert(err instanceof Error ? err.message : 'Failed to add admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const removeAdmin = async (adminEmail: string) => {
    if (hackData && hackData.admins.length <= 1) {
      alert('Cannot remove the last remaining admin!');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${adminEmail} as an admin?`)) {
      return;
    }

    try {
      const token = getAuthToken();

      const response = await fetch(`${BASE_URL}/managehack`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hackCode,
          action: 'remove_admin',
          adminEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove admin: ${response.status} ${response.statusText}`);
      }

      alert('Admin removed successfully!');
      await fetchHackathonData(); // Refresh data
    } catch (err) {
      console.error('Error removing admin:', err);
      alert(err instanceof Error ? err.message : 'Failed to remove admin');
    }
  };

  const handleInputChange = (field: keyof HackathonData, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const addPhase = () => {
    const newPhase: Phase = {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      deliverables: []
    };

    const updatedPhases = [...(editedData.phases || []), newPhase];
    handleInputChange('phases', updatedPhases);
  };

  const updatePhase = (index: number, field: keyof Phase, value: any) => {
    const updatedPhases = [...(editedData.phases || [])];
    updatedPhases[index] = { ...updatedPhases[index], [field]: value };
    handleInputChange('phases', updatedPhases);
  };

  const removePhase = (index: number) => {
    if (confirm('Are you sure you want to remove this phase?')) {
      const updatedPhases = editedData.phases?.filter((_, i) => i !== index) || [];
      handleInputChange('phases', updatedPhases);
    }
  };

  const addDeliverable = (phaseIndex: number) => {
    const newDeliverable: Deliverable = {
      description: '',
      type: 'github'
    };

    const updatedPhases = [...(editedData.phases || [])];
    updatedPhases[phaseIndex].deliverables = [...updatedPhases[phaseIndex].deliverables, newDeliverable];
    handleInputChange('phases', updatedPhases);
  };

  const updateDeliverable = (phaseIndex: number, deliverableIndex: number, field: keyof Deliverable, value: string) => {
    const updatedPhases = [...(editedData.phases || [])];
    updatedPhases[phaseIndex].deliverables[deliverableIndex] = {
      ...updatedPhases[phaseIndex].deliverables[deliverableIndex],
      [field]: value
    };
    handleInputChange('phases', updatedPhases);
  };

  const removeDeliverable = (phaseIndex: number, deliverableIndex: number) => {
    const updatedPhases = [...(editedData.phases || [])];
    updatedPhases[phaseIndex].deliverables = updatedPhases[phaseIndex].deliverables.filter((_, i) => i !== deliverableIndex);
    handleInputChange('phases', updatedPhases);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Helper function to get total team members count
  const getTotalMembersCount = (team: Registration): number => {
    let count = 0;
    if (team.teamLeader) count += 1;
    if (team.teamMembers) count += team.teamMembers.length;
    return count;
  };

  // Judging functions - Updated to match actual JSON structure
  const toggleTeamExpansion = (teamId: string) => {
    const newExpanded = new Set(expandedTeamIds);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeamIds(newExpanded);
  };

  const handleScoreInputChange = (teamId: string, phaseId: string, value: string) => {
    setScoreInputs(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [phaseId]: value
      }
    }));
  };

  const handleSaveScore = async (teamId: string, phaseId: string, rawScore: string) => {
    const score = parseInt(rawScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      alert('Score must be a number between 0 and 100');
      return;
    }

    // Find phase index
    const phaseIndex = hackData?.phases.findIndex(p => p.name === phaseId) ?? -1;
    if (phaseIndex === -1) {
      alert('Phase not found');
      return;
    }

    const saveKey = `${teamId}-${phaseId}`;
    try {
      setScoreSaving(prev => ({ ...prev, [saveKey]: true }));
      const token = getAuthToken();

      console.log('Saving score:', { teamId, phaseIndex, hackCode, score }); // Debug log

      const response = await fetch(`${BASE_URL}/grading?hackCode=${encodeURIComponent(hackCode)}&teamId=${encodeURIComponent(teamId)}&phaseId=${phaseIndex}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          phaseId: phaseIndex,
          hackCode,
          score
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Score save error response:', errorText);
        throw new Error(`Failed to save score: ${response.status} ${response.statusText}`);
      }

      alert('Score saved successfully!');

      // Clear the input for this team/phase
      setScoreInputs(prev => ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          [phaseId]: ''
        }
      }));

      // Refresh the data to get updated scores
      await fetchHackathonData();

    } catch (err) {
      console.error('Error saving score:', err);
      alert(err instanceof Error ? err.message : 'Failed to save score');
    } finally {
      setScoreSaving(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  // Updated to match actual JSON structure
  const getTeamSubmission = (team: Registration, phaseId: string): Submission | undefined => {
    const phaseIndex = hackData?.phases.findIndex(p => p.name === phaseId) ?? -1;
    return team.submissions?.find(sub => sub.phaseId === phaseIndex);
  };

  // Updated to get score directly from submission
  const getCurrentScore = (team: Registration, phaseId: string): number | undefined => {
    const submission = getTeamSubmission(team, phaseId);
    return submission?.score;
  };

  const getScoreInput = (teamId: string, phaseId: string): string => {
    return scoreInputs[teamId]?.[phaseId] || '';
  };

  const isScoreInputActive = (teamId: string, phaseId: string): boolean => {
    const input = scoreInputs[teamId]?.[phaseId];
    return input !== undefined && input !== '';
  };

  // Helper function to calculate total score for a team
  const calculateTeamTotalScore = (team: Registration): number => {
    if (!team.submissions) return 0;
    return team.submissions.reduce((total, submission) => {
      return total + (submission.score || 0);
    }, 0);
  };

  // Helper function to get leaderboard data
  const getLeaderboardData = () => {
    if (!hackData?.registrations) return [];

    return hackData.registrations
      .map(team => ({
        teamId: team.teamId,
        teamName: team.teamName || team.teamId,
        totalScore: calculateTeamTotalScore(team),
        submissions: team.submissions || [],
        memberCount: getTotalMembersCount(team)
      }))
      .sort((a, b) => b.totalScore - a.totalScore); // Descending order
  };

  // 1. Add new state variables after the existing state declarations
  const [activeLeaderboardPhase, setActiveLeaderboardPhase] = useState<string>('overall');
  const [eliminationCount, setEliminationCount] = useState<string>('');
  const [eliminating, setEliminating] = useState(false);

  // 2. Add new helper functions after the existing helper functions

  // Define unified interface for leaderboard data
  interface LeaderboardTeam {
    teamId: string;
    teamName: string;
    score: number; // This will be either phase score or total score
    submissions?: Submission[];
    memberCount: number;
    hasSubmission?: boolean;
  }

  // Helper function to get phase-wise leaderboard data
  const getPhaseLeaderboardData = (phaseId: string): LeaderboardTeam[] => {
    if (!hackData?.registrations) return [];

    const phaseIndex = hackData.phases.findIndex(p => p.name === phaseId);
    if (phaseIndex === -1) return [];

    return hackData.registrations
      .map(team => {
        const submission = team.submissions?.find(sub => sub.phaseId === phaseIndex);
        const hasSubmission = submission && submission.submissions && Object.keys(submission.submissions).length > 0;
        return {
          teamId: team.teamId,
          teamName: team.teamName || team.teamId,
          score: submission?.score || 0,
          hasSubmission,
          memberCount: getTotalMembersCount(team)
        };
      })
      .filter(team => team.hasSubmission) // Only show teams that have submitted
      .sort((a, b) => b.score - a.score); // Descending order
  };

  // Helper function to get overall leaderboard data
  const getOverallLeaderboardData = (): LeaderboardTeam[] => {
    if (!hackData?.registrations) return [];

    return hackData.registrations
      .map(team => ({
        teamId: team.teamId,
        teamName: team.teamName || team.teamId,
        score: calculateTeamTotalScore(team), // Use 'score' instead of 'totalScore'
        submissions: team.submissions || [],
        memberCount: getTotalMembersCount(team)
      }))
      .sort((a, b) => b.score - a.score); // Descending order
  };

  // Function to handle team elimination
  const handleElimination = async () => {
    const count = parseInt(eliminationCount, 10);
    if (isNaN(count) || count <= 0) {
      alert('Please enter a valid number of teams to eliminate');
      return;
    }

    let teamsData;
    let phaseIndex = -1;

    if (activeLeaderboardPhase === 'overall') {
      teamsData = getOverallLeaderboardData();
    } else {
      teamsData = getPhaseLeaderboardData(activeLeaderboardPhase);
      phaseIndex = hackData?.phases.findIndex(p => p.name === activeLeaderboardPhase) ?? -1;
    }

    if (count >= teamsData.length) {
      alert('Cannot eliminate all teams!');
      return;
    }

    // Calculate cutoff score
    const sortedTeams = [...teamsData].sort((a, b) => b.score - a.score);

    const cutoffTeam = sortedTeams[sortedTeams.length - count - 1];
    const cutoffScore = cutoffTeam.score;

    if (!confirm(`This will eliminate ${count} teams with score ${cutoffScore} or below. Are you sure?`)) {
      return;
    }

    try {
      setEliminating(true);
      const token = getAuthToken();

      console.log(hackCode);
      console.log(phaseIndex);
      console.log(cutoffScore);

      const response = await fetch(`${BASE_URL}/eliminate?hackCode=${encodeURIComponent(hackCode)}&phaseId=${phaseIndex}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cutoff_score: cutoffScore
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Elimination error response:', errorText);
        throw new Error(`Failed to eliminate teams: ${response.status} ${response.statusText}`);
      }

      alert(`Successfully eliminated ${count} teams with cutoff score: ${cutoffScore}`);
      setEliminationCount('');
      await fetchHackathonData(); // Refresh data

    } catch (err) {
      console.error('Error eliminating teams:', err);
      alert(err instanceof Error ? err.message : 'Failed to eliminate teams');
    } finally {
      setEliminating(false);
    }
  };

  // Handler for tab navigation
  const handleTabClick = (tabId: string) => {
    if (tabId === 'announcements') {
      router.push(`/announcements/${hackCode}`);
      return;
    }
    
    if (tabId === 'scoring') {
      router.push(`/judgehack/${hackCode}`);
      return;
    }

    if (tabId === 'sponsors') {
      router.push(`/admin/sponsormanagement/${hackCode}`);
      return;
    }

    setActiveTab(tabId as TabType);
  };

  // Set a default auth token if needed (replace with your auth logic)
  useEffect(() => {
    // You might want to get the token from props, context, or some other source
    // For now, setting empty string - replace with actual auth implementation
    setAuthToken('');
  }, []);

  useEffect(() => {
    if (hackCode) {
      fetchHackathonData();
    }
  }, [hackCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading hackathon data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          <p>Error: {error}</p>
          <button
            onClick={fetchHackathonData}
            className="mt-4 bg-blue-600 text-black px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!hackData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">No hackathon data found</div>
      </div>
    );
  }

  return (
  <>
    <Navbar />
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl bg-white mx-auto">
        <h1 className="text-3xl font-bold py-6 mx-6  mb-6 text-black">Manage Hackathon: {hackData.eventName}</h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-800 mx-6 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Details' },
              { id: 'phases', label: 'Phases' },
              { id: 'admins', label: 'Admins' },
              { id: 'sponsors', label: 'Sponsor Showcases' },
              { id: 'announcements', label: 'Announcements' },
              { id: 'scoring', label: 'Scoring & Evaluation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-900 hover:text-gray-1000 hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="mx-6 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Hackathon Overview</h2>
            </div>

            {/* Main Info Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg">ℹ️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Event Name</span>
                    <span className="text-sm font-semibold text-gray-900 text-right max-w-[200px]">{hackData.eventName}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Tagline</span>
                    <span className="text-sm text-gray-700 text-right max-w-[200px]">{hackData.eventTagline}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Type</span>
                    <span className="text-sm text-gray-700">{hackData.eventType}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Mode</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#008622]/10 text-[#008622]">
                      {hackData.mode === 'online' && '🌐'}
                      {hackData.mode === 'offline' && '🏢'}
                      {hackData.mode === 'hybrid' && '🔄'}
                      <span className="ml-1 capitalize">{hackData.mode}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Team Size</span>
                    <span className="text-sm font-semibold text-gray-900">{hackData.teamSize} members</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Max Teams</span>
                    <span className="text-sm font-semibold text-gray-900">{hackData.maxTeams}</span>
                  </div>
                  <div className="flex justify-between items-center py-2.5">
                    <span className="text-sm font-medium text-gray-500">Hack Code</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-mono bg-gray-100 text-gray-800 border">
                      {hackData.hackCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Timeline Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg">📅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Event Timeline</h3>
                </div>
                <div className="space-y-5">
                  {(() => {
                    const now = new Date();
                    const regStart = new Date(hackData.registrationStartDate);
                    const regEnd = new Date(hackData.registrationEndDate);
                    const eventStart = new Date(hackData.eventStartDate);
                    const eventEnd = new Date(hackData.eventEndDate);
                    
                    const events = [
                      { name: 'Registration Opens', date: regStart, dateStr: formatDate(hackData.registrationStartDate) },
                      { name: 'Registration Closes', date: regEnd, dateStr: formatDate(hackData.registrationEndDate) },
                      { name: 'Event Starts', date: eventStart, dateStr: formatDate(hackData.eventStartDate) },
                      { name: 'Event Ends', date: eventEnd, dateStr: formatDate(hackData.eventEndDate) }
                    ];
                    
                    return events.map((event, index) => {
                      const isCompleted = now > event.date;
                      const isCurrent = index > 0 && now > events[index - 1].date && now <= event.date;
                      const isLast = index === events.length - 1;
                      
                      return (
                        <div key={index} className={`relative pl-6 ${!isLast ? 'border-l-2 border-gray-200' : ''}`}>
                          <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 ${
                            isCompleted 
                              ? 'bg-[#008622] border-[#008622]' 
                              : isCurrent 
                                ? 'bg-blue-500 border-blue-500 animate-pulse' 
                                : 'bg-white border-gray-300'
                          }`}>
                            {isCompleted && (
                              <div className="flex items-center justify-center w-full h-full">
                                <span className="text-white text-xs">✓</span>
                              </div>
                            )}
                          </div>
                          <div className="pb-3">
                            <p className={`text-sm font-medium ${
                              isCompleted ? 'text-[#008622]' : isCurrent ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                              {event.name}
                              {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Current</span>}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{event.dateStr}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Event Description</h3>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{hackData.eventDescription}</p>
            </div>

            {/* Secondary Info Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Fee Information Card */}
              {hackData.hasFee && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Fee Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Registration Fee</span>
                      <span className="text-lg font-bold text-[#008622]">₹{hackData.fee}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">UPI ID</p>
                      <p className="text-sm font-mono bg-gray-50 p-3 rounded border text-gray-800">{hackData.upiId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Stats Card */}
              {hackData.registrations && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg">👥</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Registration Stats</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#008622]">{hackData.registrations.length}</p>
                      <p className="text-sm text-gray-500">Registered Teams</p>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-[#008622] h-full transition-all duration-300"
                        style={{ width: `${Math.min((hackData.registrations.length / parseInt(hackData.maxTeams)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>0</span>
                      <span>{hackData.maxTeams} max</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sponsors Section */}
            {hackData.sponsors && hackData.sponsors.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🤝</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Event Sponsors</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {hackData.sponsors.map((sponsor, index) => (
                    <div key={index} className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#008622]/10 to-[#008622]/5 border border-[#008622]/20 rounded-lg">
                      <span className="text-sm font-medium text-[#008622]">{sponsor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes Section */}
            {hackData.prizes && hackData.prizes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg">🏆</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Prizes & Awards</h3>
                </div>
                <div className="grid gap-4">
                  {hackData.prizes.map((prize, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-[#008622]/5 to-transparent border border-[#008622]/10 rounded-lg">
                      <div className="w-6 h-6 bg-[#008622]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-bold text-[#008622]">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">{prize.title}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{prize.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚙️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Details</h2>
              </div>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 bg-[#008622] text-white font-medium rounded-lg hover:bg-[#006b1b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Event Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Event Name</label>
                      <input
                        type="text"
                        value={editedData.eventName || ''}
                        onChange={(e) => handleInputChange('eventName', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                        placeholder="Enter event name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Event Tagline</label>
                      <input
                        type="text"
                        value={editedData.eventTagline || ''}
                        onChange={(e) => handleInputChange('eventTagline', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                        placeholder="Enter event tagline"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Mode</label>
                        <select
                          value={editedData.mode || ''}
                          onChange={(e) => handleInputChange('mode', e.target.value)}
                          className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                        >
                          <option value="online">🌐 Online</option>
                          <option value="offline">🏢 Offline</option>
                          <option value="hybrid">🔄 Hybrid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700">Team Size</label>
                        <input
                          type="number"
                          value={editedData.teamSize || ''}
                          onChange={(e) => handleInputChange('teamSize', e.target.value)}
                          className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Max Teams</label>
                      <input
                        type="number"
                        value={editedData.maxTeams || ''}
                        onChange={(e) => handleInputChange('maxTeams', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                        min="1"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Event Description</h3>
                  <textarea
                    value={editedData.eventDescription || ''}
                    onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                    rows={6}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Describe your hackathon..."
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Event Dates</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Event Start Date</label>
                      <input
                        type="datetime-local"
                        value={editedData.eventStartDate || ''}
                        onChange={(e) => handleInputChange('eventStartDate', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Event End Date</label>
                      <input
                        type="datetime-local"
                        value={editedData.eventEndDate || ''}
                        onChange={(e) => handleInputChange('eventEndDate', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Registration Start Date</label>
                      <input
                        type="datetime-local"
                        value={editedData.registrationStartDate || ''}
                        onChange={(e) => handleInputChange('registrationStartDate', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Registration End Date</label>
                      <input
                        type="datetime-local"
                        value={editedData.registrationEndDate || ''}
                        onChange={(e) => handleInputChange('registrationEndDate', e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Fee Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">Has Fee</label>
                      <select
                        value={editedData.hasFee ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('hasFee', e.target.value === 'true')}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                      >
                        <option value="false">💰 Free Event</option>
                        <option value="true">💳 Paid Event</option>
                      </select>
                    </div>

                    {editedData.hasFee && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">Fee Amount</label>
                          <input
                            type="text"
                            value={editedData.fee || ''}
                            onChange={(e) => handleInputChange('fee', e.target.value)}
                            className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                            placeholder="Enter fee amount"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700">UPI ID</label>
                          <input
                            type="text"
                            value={editedData.upiId || ''}
                            onChange={(e) => handleInputChange('upiId', e.target.value)}
                            className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                            placeholder="Enter UPI ID"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <div className="mx-6 space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Phases</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">Phase Configuration</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addPhase}
                    className="inline-flex items-center px-4 py-2 bg-[#008622] text-white font-medium rounded-lg hover:bg-[#006b1b] transition-colors duration-200 shadow-sm"
                  >
                    <span className="mr-2">+</span>
                    Add Phase
                  </button>
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors duration-200 shadow-sm"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💾</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>

              {editedData.phases && editedData.phases.length > 0 ? (
                <div className="space-y-6">
                  {editedData.phases.map((phase, phaseIndex) => (
                    <div key={phaseIndex} className="bg-gradient-to-r from-gray-50 to-gray-50/50 border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-[#008622]">{phaseIndex + 1}</span>
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900">Phase {phaseIndex + 1}</h4>
                        </div>
                        <button
                          onClick={() => removePhase(phaseIndex)}
                          className="inline-flex items-center px-3 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg text-sm hover:bg-rose-100 transition-colors duration-200 border border-rose-200"
                        >
                          <span className="mr-1">×</span>
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Phase Name</label>
                            <input
                              type="text"
                              value={phase.name}
                              onChange={(e) => updatePhase(phaseIndex, 'name', e.target.value)}
                              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                              placeholder="Enter phase name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Phase Description</label>
                            <textarea
                              value={phase.description}
                              onChange={(e) => updatePhase(phaseIndex, 'description', e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200 resize-none"
                              placeholder="Describe this phase"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">Start Date & Time</label>
                            <input
                              type="datetime-local"
                              value={phase.startDate}
                              onChange={(e) => updatePhase(phaseIndex, 'startDate', e.target.value)}
                              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700">End Date & Time</label>
                            <input
                              type="datetime-local"
                              value={phase.endDate}
                              onChange={(e) => updatePhase(phaseIndex, 'endDate', e.target.value)}
                              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Deliverables Section */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                              <span className="text-xs font-bold text-slate-600">📦</span>
                            </div>
                            <h5 className="text-md font-semibold text-gray-900">Phase Deliverables</h5>
                          </div>
                          <button
                            onClick={() => addDeliverable(phaseIndex)}
                            className="inline-flex items-center px-3 py-2 bg-slate-50 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-100 transition-colors duration-200 border border-slate-200"
                          >
                            <span className="mr-1">+</span>
                            Add Deliverable
                          </button>
                        </div>

                        {phase.deliverables.length > 0 ? (
                          <div className="space-y-3">
                            {phase.deliverables.map((deliverable, deliverableIndex) => (
                              <div key={deliverableIndex} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Deliverable Type</label>
                                    <select
                                      value={deliverable.type}
                                      onChange={(e) => updateDeliverable(phaseIndex, deliverableIndex, 'type', e.target.value)}
                                      className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                                    >
                                      <option value="github">GitHub Repository</option>
                                      <option value="canva">Canva Design</option>
                                      <option value="mvp">MVP Demo</option>
                                      <option value="drive">Google Drive</option>
                                      <option value="figma">Figma Design</option>
                                      <option value="video">Video Submission</option>
                                      <option value="presentation">Presentation</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
                                    <input
                                      type="text"
                                      value={deliverable.description}
                                      onChange={(e) => updateDeliverable(phaseIndex, deliverableIndex, 'description', e.target.value)}
                                      className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                                      placeholder="Describe the deliverable"
                                    />
                                  </div>

                                  <div className="flex items-end">
                                    <button
                                      onClick={() => removeDeliverable(phaseIndex, deliverableIndex)}
                                      className="w-full inline-flex items-center justify-center px-3 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg text-sm hover:bg-rose-100 transition-colors duration-200 border border-rose-200"
                                    >
                                      <span className="mr-1">×</span>
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                              <span className="text-xl text-gray-400">📦</span>
                            </div>
                            <p className="text-gray-500 text-sm mb-3">No deliverables configured for this phase</p>
                            <button
                              onClick={() => addDeliverable(phaseIndex)}
                              className="inline-flex items-center px-4 py-2 bg-[#008622] text-white font-medium rounded-lg hover:bg-[#006b1b] transition-colors duration-200 shadow-sm"
                            >
                              <span className="mr-2">+</span>
                              Add First Deliverable
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-gray-400">⚡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Phases Configured</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Phases help organize your hackathon timeline and define what participants need to deliver at each stage.
                  </p>
                  <button
                    onClick={addPhase}
                    className="inline-flex items-center px-6 py-3 bg-[#008622] text-white font-medium rounded-lg hover:bg-[#006b1b] transition-colors duration-200 shadow-sm"
                  >
                    <span className="mr-2">+</span>
                    Create First Phase
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Admins</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="text-base">➕</span>
                  Add New Admin
                </h3>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Enter admin email address"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#008622] focus:border-transparent transition-all duration-200"
                  />
                  <button
                    onClick={addAdmin}
                    disabled={adminLoading}
                    className="px-6 py-3 bg-[#008622] text-white font-medium rounded-lg hover:bg-[#006b1b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
                  >
                    {adminLoading ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Add Admin'
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
                  <span className="text-base">👑</span>
                  Current Admins ({hackData.admins.length})
                </h3>
                {hackData.admins.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-gray-500">No admins found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hackData.admins.map((admin, index) => (
                      <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#008622]/10 rounded-full flex items-center justify-center">
                            <span className="text-sm">👤</span>
                          </div>
                          <span className="text-gray-900 font-medium">{admin}</span>
                        </div>
                        <button
                          onClick={() => removeAdmin(admin)}
                          disabled={hackData.admins.length <= 1}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {hackData.admins.length <= 1 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      <span>⚠️</span>
                      Cannot remove the last remaining admin
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
}