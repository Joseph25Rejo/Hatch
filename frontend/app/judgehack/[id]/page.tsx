'use client';

import { useEffect, useState } from 'react';
import { Instrument_Sans } from 'next/font/google';
import Navbar from '../../../components/navbar';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});
import { useParams } from 'next/navigation';

const BASE_URL = "https://thecodeworks.in/hatch";

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

type TabType = 'overview' | 'details' | 'phases' | 'admins' | 'judging' | 'leaderboard';

export default function ManageHackPage() {
  return (
    <div className={instrumentSans.className}>
      <ManageHackPageContent />
    </div>
  );
}

function ManageHackPageContent() {
  const params = useParams();
  const hackCode = params.id as string;

  const [hackData, setHackData] = useState<HackathonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('judging');
  const [editedData, setEditedData] = useState<Partial<HackathonData>>({});
  const [saving, setSaving] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Judging state
  const [activePhaseId, setActivePhaseId] = useState<string>('');
  const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
  const [scoreInputs, setScoreInputs] = useState<Record<string, Record<string, string>>>({});
  const [scoreSaving, setScoreSaving] = useState<Record<string, boolean>>({});
  const [activeScoreModal, setActiveScoreModal] = useState<string | null>(null);

  // Leaderboard state
  const [activeLeaderboardPhase, setActiveLeaderboardPhase] = useState<string>('overall');
  const [eliminationCount, setEliminationCount] = useState<string>('');
  const [eliminating, setEliminating] = useState(false);
  const [publishing, setPublishing] = useState(false);

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

  // Handle score input changes and modal state
  const handleScoreInputChange = (teamId: string, phaseId: string, value: string) => {
    const modalKey = `${teamId}-${phaseId}`;
    setActiveScoreModal(modalKey);
    setScoreInputs(prev => ({
      ...prev,
      [teamId]: {
        ...prev[teamId],
        [phaseId]: value
      }
    }));
  };

  // Close score modal
  const closeScoreModal = () => {
    setActiveScoreModal(null);
    // Don't clear score inputs here to preserve values
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

      // Clear the input for this team/phase and close modal
      setScoreInputs(prev => ({
        ...prev,
        [teamId]: {
          ...prev[teamId],
          [phaseId]: ''
        }
      }));
      setActiveScoreModal(null);

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

  // Check if score modal is active for specific team/phase
  const isScoreModalActive = (teamId: string, phaseId: string): boolean => {
    return activeScoreModal === `${teamId}-${phaseId}`;
  };

  // Helper function to calculate total score for a team
  const calculateTeamTotalScore = (team: Registration): number => {
    if (!team.submissions) return 0;
    return team.submissions.reduce((total, submission) => {
      return total + (submission.score || 0);
    }, 0);
  };

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

  // Function to handle publishing results
  const handlePublishResults = async () => {
    const leaderboardData = getOverallLeaderboardData();
    
    if (leaderboardData.length === 0) {
      alert('No teams with scores to publish');
      return;
    }

    const confirmMessage = `This will publish the overall leaderboard with ${leaderboardData.length} teams. This action will make the leaderboard public and send certificates to all participants. Are you sure you want to continue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setPublishing(true);
      const token = getAuthToken();

      // Prepare the leaderboard JSON data
      const leaderboardJson = leaderboardData.map((team, index) => ({
        rank: index + 1,
        teamId: team.teamId,
        teamName: team.teamName,
        totalScore: team.score,
        memberCount: team.memberCount,
        phaseScores: team.submissions?.map(sub => ({
          phaseId: sub.phaseId,
          phaseName: hackData?.phases[sub.phaseId]?.name || `Phase ${sub.phaseId + 1}`,
          score: sub.score || 0
        })) || []
      }));

      const fullResultsData = {
        hackCode,
        eventName: hackData?.eventName,
        publishedAt: new Date().toISOString(),
        totalTeams: leaderboardData.length,
        leaderboard: leaderboardJson
      };

      // Download JSON file locally
      const downloadJson = () => {
        const dataStr = JSON.stringify(fullResultsData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `${hackCode}_results_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      };

      console.log('Publishing results:', fullResultsData);

      // Send to API
      const response = await fetch(`${BASE_URL}/publishresults?hackCode=${encodeURIComponent(hackCode)}`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullResultsData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Publish results error response:', errorText);
        throw new Error(`Failed to publish results: ${response.status} ${response.statusText}`);
      }

      // Download the JSON file
      downloadJson();

      alert('Results published successfully! The leaderboard is now public, certificates are being sent to participants, and the results JSON has been downloaded.');

    } catch (err) {
      console.error('Error publishing results:', err);
      alert(err instanceof Error ? err.message : 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  // Helper function to determine link type and render appropriate button/preview
  const renderDeliverableLink = (type: string, value: string) => {
    if (!value || typeof value !== 'string') return null;

    const lowerType = type.toLowerCase();
    const lowerValue = value.toLowerCase();

    // Check for Canva links
    if (lowerType === 'canva' || lowerValue.includes('canva.com')) {
      return (
        <div className="space-y-2">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm bg-purple-50 px-2 py-1 rounded transition-colors"
          >
            🎨 Open Canva
          </a>
        </div>
      );
    }

    // Check for Google Drive links
    if (lowerType === 'drive' || lowerValue.includes('drive.google.com') || lowerValue.includes('docs.google.com')) {
      // Extract file ID from Google Drive URL for embed
      let embedUrl = value;
      const fileIdMatch = value.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }

      return (
        <div className="space-y-2">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            📁 Open Drive
          </a>
        </div>
      );
    }

    // Check for GitHub links
    if (lowerType === 'github' || lowerValue.includes('github.com')) {
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-800 hover:text-gray-900 text-sm bg-gray-100 px-2 py-1 rounded transition-colors"
            >
              💻 Open GitHub
            </a>
            <a
              href={`/runcheck?link=${encodeURIComponent(value)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm bg-red-50 px-2 py-1 rounded transition-colors"
            >
              🔍 Run Plagiarism Checker
            </a>
          </div>
        </div>
      );
    }

    // For all other links, just open in new tab
    if (lowerType === 'figma' || lowerType === 'mvp' || lowerType === 'presentation' || lowerType === 'other' || lowerType === 'video' || value.startsWith('http')) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm bg-blue-50 px-2 py-1 rounded transition-colors"
        >
          🔗 Open Link
        </a>
      );
    }

    return null;
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

  // Close modal when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeScoreModal && !(event.target as Element).closest('.score-modal')) {
        closeScoreModal();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeScoreModal) {
        closeScoreModal();
      }
    };

    if (activeScoreModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [activeScoreModal]);

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
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
    <Navbar/>
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Hackathon: {hackData.eventName}</h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'judging', label: 'Judging' },
              { id: 'leaderboard', label: 'Leaderboard' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Score Modal Backdrop */}
        {activeScoreModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeScoreModal}
          />
        )}

        {activeTab === 'judging' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl text-gray-900 font-semibold mb-4">Judging</h2>

            {hackData.phases && hackData.phases.length > 0 ? (
              <>
                {/* Phase tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-8">
                    {hackData.phases.map((phase) => (
                      <button
                        key={phase.name}
                        onClick={() => setActivePhaseId(phase.name)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activePhaseId === phase.name
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {phase.name}
                        <br />
                        <span className="text-xs text-gray-400">
                          {formatDate(phase.startDate).split(',')[0]} - {formatDate(phase.endDate).split(',')[0]}
                        </span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Teams table for active phase */}
                {hackData.registrations && hackData.registrations.length > 0 ? (
                  <div className="space-y-4">
                    {hackData.registrations.map((team) => {
                      const submission = getTeamSubmission(team, activePhaseId);
                      const currentScore = getCurrentScore(team, activePhaseId);
                      const scoreInput = getScoreInput(team.teamId, activePhaseId);
                      const saveKey = `${team.teamId}-${activePhaseId}`;
                      const isSaving = scoreSaving[saveKey] || false;
                      const isExpanded = expandedTeamIds.has(team.teamId);
                      const hasSubmission = submission && submission.submissions && Object.keys(submission.submissions).length > 0;
                      const isModalActive = isScoreModalActive(team.teamId, activePhaseId);

                      return (
                        <div key={team.teamId} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleTeamExpansion(team.teamId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-lg text-gray-800">
                                    {team.teamName || team.teamId}
                                  </h3>
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                                    {getTotalMembersCount(team)} member{getTotalMembersCount(team) !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  {/* Submission Status */}
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${hasSubmission ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                    <span className={`text-sm ${hasSubmission ? 'text-green-700' : 'text-red-700'}`}>
                                      {hasSubmission ? 'Submitted' : 'Not submitted'}
                                    </span>
                                    {submission?.submittedAt && (
                                      <span className="text-xs text-gray-500">
                                        on {formatDate(submission.submittedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Enhanced Score Section */}
                              <div className="flex items-center gap-4">
                                <div className="text-right relative">
                                  {currentScore !== undefined ? (
                                    // Score is already given
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                      <div className="flex items-center gap-2">
                                        <div className="text-2xl font-bold text-green-700">
                                          {currentScore}
                                        </div>
                                        <div className="text-green-600">/100</div>
                                      </div>
                                      <div className="text-xs text-green-600 mb-2">Scored</div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScoreInputChange(team.teamId, activePhaseId, currentScore.toString());
                                        }}
                                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                                      >
                                        Edit Score
                                      </button>
                                    </div>
                                  ) : hasSubmission ? (
                                    // Has submission but no score
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                      <div className="text-sm font-medium text-orange-700 mb-2">
                                        Awaiting Score
                                      </div>
                                      <div className="text-xs text-orange-600 mb-2">
                                        Submitted
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScoreInputChange(team.teamId, activePhaseId, '');
                                        }}
                                        className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors"
                                      >
                                        Add Score
                                      </button>
                                    </div>
                                  ) : (
                                    // No submission
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                      <div className="text-sm text-gray-600">
                                        No Submission
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Cannot score
                                      </div>
                                    </div>
                                  )}

                                  {/* Score Input Modal */}
                                  {isModalActive && (
                                    <div className="fixed inset-0 flex items-center justify-center z-50">
                                      <div className="score-modal bg-white border border-gray-300 rounded-lg shadow-xl p-6 w-80 max-w-sm mx-4">
                                        <div className="mb-4">
                                          <h4 className="font-semibold text-lg text-gray-800 mb-2">
                                            Score for {team.teamName || team.teamId}
                                          </h4>
                                          <p className="text-sm text-gray-600 mb-3">
                                            Phase: {activePhaseId}
                                          </p>
                                          <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Enter Score (0-100)
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            placeholder="Score"
                                            value={scoreInput}
                                            onChange={(e) => {
                                              setScoreInputs(prev => ({
                                                ...prev,
                                                [team.teamId]: {
                                                  ...prev[team.teamId],
                                                  [activePhaseId]: e.target.value
                                                }
                                              }));
                                            }}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex gap-3">
                                          <button
                                            onClick={() => handleSaveScore(team.teamId, activePhaseId, scoreInput)}
                                            disabled={!scoreInput || isNaN(parseInt(scoreInput)) || parseInt(scoreInput) < 0 || parseInt(scoreInput) > 100 || isSaving}
                                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {isSaving ? 'Saving...' : 'Save Score'}
                                          </button>
                                          <button
                                            onClick={closeScoreModal}
                                            className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="text-gray-400">
                                  {isExpanded ? '▼' : '▶'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded content */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50">
                              <div className="p-4">
                                {/* Team members */}
                                <div className="mb-6">
                                  <h4 className="font-medium text-sm mb-3 text-gray-800">Team Members:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {/* Team Leader */}
                                    {team.teamLeader && (
                                      <div className="bg-gradient-to-r from-green-100 to-green-200 border border-green-300 text-green-800 px-3 py-2 rounded-lg text-sm">
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium">👑 {team.teamLeader.name || team.teamLeader.email || 'Team Leader'}</span>
                                        </div>
                                        {team.teamLeader.course && team.teamLeader.graduatingYear && (
                                          <div className="text-xs text-green-700 mt-1">
                                            {team.teamLeader.course} - {team.teamLeader.graduatingYear}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {/* Team Members */}
                                    {team.teamMembers && team.teamMembers.map((member, idx) => (
                                      <div key={idx} className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 text-blue-800 px-3 py-2 rounded-lg text-sm">
                                        <div className="font-medium">
                                          {member.name || member.email || `Member ${idx + 1}`}
                                        </div>
                                        {member.course && member.graduatingYear && (
                                          <div className="text-xs text-blue-700 mt-1">
                                            {member.course} - {member.graduatingYear}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Deliverables */}
                                <div>
                                  <h4 className="font-medium text-sm mb-3 text-gray-800">
                                    Deliverables for {activePhaseId}:
                                  </h4>
                                  {hasSubmission ? (
                                    <div className="space-y-3">
                                      {Object.entries(submission.submissions!).map(([type, value], idx) => (
                                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide">
                                                  {type}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-700 break-all bg-gray-50 p-2 rounded mb-3">
                                                {value}
                                              </p>
                                              {/* Enhanced link rendering with previews */}
                                              {renderDeliverableLink(type, value)}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="text-gray-400 text-4xl mb-2">📋</div>
                                      <p className="text-gray-500 text-sm">No deliverables submitted for this phase</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">👥</div>
                    <p className="text-gray-500 text-lg">No teams registered yet</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg">No phases defined yet. Please add phases first.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl text-gray-900 font-semibold mb-4">Leaderboard</h2>

            {/* Phase tabs for leaderboard */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveLeaderboardPhase('overall')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeLeaderboardPhase === 'overall'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overall
                </button>
                {hackData.phases && hackData.phases.map((phase) => (
                  <button
                    key={phase.name}
                    onClick={() => setActiveLeaderboardPhase(phase.name)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeLeaderboardPhase === phase.name
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {phase.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Publish Results button - Only show on Overall tab */}
            {activeLeaderboardPhase === 'overall' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-green-800 mb-1">Publish Final Results</h3>
                    <p className="text-sm text-green-700">
                      Make the overall leaderboard public and send certificates to all participants
                    </p>
                  </div>
                  <button
                    onClick={handlePublishResults}
                    disabled={publishing || getOverallLeaderboardData().length === 0}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
                  >
                    {publishing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Publishing...
                      </>
                    ) : (
                      <>
                        🏆 Publish Results
                      </>
                    )}
                  </button>
                </div>
                {getOverallLeaderboardData().length === 0 && (
                  <p className="text-xs text-green-600 mt-2">
                    ⚠️ No teams with scores available to publish
                  </p>
                )}
              </div>
            )}

            {/* Elimination controls - Only show for phase tabs, not overall */}
            {activeLeaderboardPhase !== 'overall' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-medium text-red-800 mb-2">Team Elimination</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-red-700 mb-1">
                      Number of teams to eliminate from bottom
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter number of teams"
                      value={eliminationCount}
                      onChange={(e) => setEliminationCount(e.target.value)}
                      className="w-full border border-red-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={handleElimination}
                    disabled={!eliminationCount || isNaN(parseInt(eliminationCount)) || parseInt(eliminationCount) <= 0 || eliminating}
                    className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {eliminating ? 'Eliminating...' : 'Eliminate Teams'}
                  </button>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ This action will permanently remove teams from the hackathon based on their phase scores.
                </p>
              </div>
            )}

            {/* Leaderboard content */}
            {(() => {
              const leaderboardData = activeLeaderboardPhase === 'overall'
                ? getOverallLeaderboardData()
                : getPhaseLeaderboardData(activeLeaderboardPhase);

              return leaderboardData.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg text-gray-900 font-medium">
                      {activeLeaderboardPhase === 'overall' ? 'Overall Rankings' : `${activeLeaderboardPhase} Rankings`}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {leaderboardData.length} team{leaderboardData.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {leaderboardData.map((team, index) => {
                    return (
                      <div
                        key={team.teamId}
                        className={`border text-gray-900 rounded-lg p-4 ${
                          index === 0 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-yellow-100' :
                          index === 1 ? 'border-gray-400 bg-gradient-to-r from-gray-50 to-gray-100' :
                          index === 2 ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-orange-100' :
                          'border-gray-200 bg-white hover:bg-gray-50'
                        } transition-colors`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`text-2xl font-bold ${
                              index === 0 ? 'text-yellow-600' :
                              index === 1 ? 'text-gray-600' :
                              index === 2 ? 'text-orange-600' :
                              'text-gray-500'
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{team.teamName}</h3>
                              <p className="text-sm text-gray-600">{team.memberCount} members</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {team.score}
                            </div>
                            <div className="text-sm text-gray-500">
                              {activeLeaderboardPhase === 'overall' ? 'Total Score' : 'Phase Score'}
                            </div>
                          </div>
                        </div>

                        {/* Phase-wise breakdown for overall tab */}
                        {activeLeaderboardPhase === 'overall' && team.submissions && team.submissions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2">
                              {team.submissions.map((submission: Submission, idx: number) => {
                                const phaseName = hackData.phases[submission.phaseId]?.name || `Phase ${submission.phaseId + 1}`;
                                return (
                                  <span
                                    key={idx}
                                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                                  >
                                    {phaseName}: {submission.score || 0}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🏆</div>
                  <p className="text-gray-500 text-lg">
                    {activeLeaderboardPhase === 'overall'
                      ? 'No teams with scores yet'
                      : `No teams have submitted for ${activeLeaderboardPhase} yet`
                    }
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
    </>
  );
}