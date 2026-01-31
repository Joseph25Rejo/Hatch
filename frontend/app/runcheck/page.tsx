'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/navbar';
import { Instrument_Sans } from 'next/font/google';
import { Suspense } from 'react';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText, GitBranch, Home } from 'lucide-react';

interface SimilarFile {
  file1: string;
  file2: string;
  similarity: number;
}

interface CommitPatterns {
  commit_count: number;
  details: {
    author_score: number;
    message_score: number;
    size_score: number;
    timing_score: number;
  };
  indicators: string[];
  score: number;
}

interface InterRepositorySimilarity {
  files_checked: number;
  matches: {
    file: string;
    match_repo: string;
    match_file: string;
    snippet: string;
    match_url: string;
    confidence?: number;
    language?: string;
  }[];
  score: number;
  search_attempts: number;
  high_confidence_matches?: number;
}

interface IntraRepositorySimilarity {
  file_count: number;
  score: number;
  similar_files: SimilarFile[];
}

interface FinalAssessment {
  component_scores: {
    commit_patterns: number;
    inter_repository_similarity: number;
    intra_repository_similarity: number;
  };
  confidence: string;
  final_score: number;
  indicators: string[];
  risk_level: string;
  analysis_quality?: {
    commits_analyzed: number;
    files_analyzed: number;
    files_searched: number;
    search_queries_used: number;
    high_confidence_matches: number;
    total_matches: number;
    similar_file_pairs: number;
  };
}

interface Repository {
  created_at: string;
  language: string;
  name: string;
  owner: string;
  size: number;
  updated_at: string;
  url: string;
}

interface PlagiarismData {
  analysis: {
    commit_patterns: CommitPatterns;
    final_assessment: FinalAssessment;
    inter_repository_similarity: InterRepositorySimilarity;
    intra_repository_similarity: IntraRepositorySimilarity;
  };
  repository: Repository;
  timestamp: string;
  version: string;
}

interface ApiResponse {
  data: PlagiarismData;
  success: boolean;
}

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

const getAuthToken = ()  => {
    return localStorage.getItem('auth_token');
};

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel.toLowerCase()) {
    case 'low':
      return 'text-green-600 bg-green-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'high':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getConfidenceColor = (confidence: string): string => {
  switch (confidence.toLowerCase()) {
    case 'high':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export default function RunCheckContent() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    }>
      <RunCheckPage />
    </Suspense>
  );
}

function RunCheckPage() {
  const [data, setData] = useState<PlagiarismData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleBackNavigation = () => {
    // Try to go back in history first
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to home page if no history
      router.push('/home');
    }
  };

  useEffect(() => {
    const checkPlagiarism = async () => {
      try {
        const repositoryUrl = searchParams.get('link');
        if (!repositoryUrl) {
          throw new Error('Repository URL not provided');
        }

        const authToken = getAuthToken();
        if (!authToken) {
          throw new Error('Authentication token not found. Please login first.');
        }

        const response = await fetch(
          'https://thecodeworks.in/hatch/check-plagiarism',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'auth_token': authToken,
            },
            body: JSON.stringify({
              repository_url: repositoryUrl,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: ApiResponse = await response.json();
        
        if (!result.success) {
          throw new Error('Plagiarism check failed');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    checkPlagiarism();
  }, [searchParams]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={`${instrumentSans.className} min-h-screen bg-white flex items-center justify-center`}>
          <div className="text-center max-w-md mx-auto p-8">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#008622] mx-auto"></div>
              <Shield className="w-8 h-8 text-[#008622] absolute top-4 left-1/2 transform -translate-x-1/2" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Running Plagiarism Check</h2>
            <p className="text-gray-600 mb-4">Analyzing repository for potential plagiarism patterns...</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">This comprehensive analysis may take a few minutes</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className={`${instrumentSans.className} min-h-screen bg-white flex items-center justify-center`}>
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleBackNavigation}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </button>
                  <button
                    onClick={() => router.push('/home')}
                    className="flex-1 bg-[#008622] text-white px-4 py-2 rounded-lg hover:bg-[#006b1b] transition-colors flex items-center justify-center"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex-1 bg-[#008622] text-white px-4 py-2 rounded-lg hover:bg-[#006b1b] transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <div className={`${instrumentSans.className} min-h-screen bg-white flex items-center justify-center`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Data Available</h2>
            <p className="text-gray-600 mb-4">Unable to retrieve analysis results</p>
            <button
              onClick={() => router.push('/home')}
              className="bg-[#008622] text-white px-4 py-2 rounded-lg hover:bg-[#006b1b] transition-colors flex items-center mx-auto"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={`${instrumentSans.className} min-h-screen bg-white py-8`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackNavigation}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Previous Page
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => router.push('/home')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-[#008622]/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#008622]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Plagiarism Analysis Report
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <GitBranch className="w-4 h-4 mr-1" />
                      <span>Repository: <strong className="text-gray-900">{data.repository.name}</strong></span>
                    </div>
                    <div className="flex items-center">
                      <span>Owner: <strong className="text-gray-900">{data.repository.owner}</strong></span>
                    </div>
                    <div className="flex items-center">
                      <span>Language: <strong className="text-gray-900">{data.repository.language}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border ${
                  data.analysis.final_assessment.risk_level.toLowerCase() === 'low'
                    ? 'text-green-700 bg-green-50 border-green-200'
                    : data.analysis.final_assessment.risk_level.toLowerCase() === 'medium'
                    ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}>
                  {data.analysis.final_assessment.risk_level.toLowerCase() === 'low' && <CheckCircle className="w-4 h-4 mr-2" />}
                  {data.analysis.final_assessment.risk_level.toLowerCase() === 'medium' && <AlertTriangle className="w-4 h-4 mr-2" />}
                  {data.analysis.final_assessment.risk_level.toLowerCase() === 'high' && <XCircle className="w-4 h-4 mr-2" />}
                  {data.analysis.final_assessment.risk_level} Risk
                </div>
              </div>
            </div>
          </div>

          {/* Final Assessment */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Final Assessment</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className="text-4xl font-bold text-[#008622] mb-2">
                  {data.analysis.final_assessment.final_score.toFixed(1)}%
                </div>
                <p className="text-gray-600 font-medium">Overall Score</p>
                <p className="text-xs text-gray-500 mt-1">Plagiarism Likelihood</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className={`text-3xl font-bold mb-2 ${
                  data.analysis.final_assessment.confidence.toLowerCase() === 'high'
                    ? 'text-green-600'
                    : data.analysis.final_assessment.confidence.toLowerCase() === 'medium'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {data.analysis.final_assessment.confidence}
                </div>
                <p className="text-gray-600 font-medium">Confidence</p>
                <p className="text-xs text-gray-500 mt-1">Analysis Reliability</p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className={`text-3xl font-bold mb-2 ${
                  data.analysis.final_assessment.risk_level.toLowerCase() === 'low'
                    ? 'text-green-600'
                    : data.analysis.final_assessment.risk_level.toLowerCase() === 'medium'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {data.analysis.final_assessment.risk_level}
                </div>
                <p className="text-gray-600 font-medium">Risk Level</p>
                <p className="text-xs text-gray-500 mt-1">Plagiarism Risk</p>
              </div>
            </div>
            {data.analysis.final_assessment.indicators.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
                  Key Risk Indicators
                </h3>
                <ul className="space-y-2">
                  {data.analysis.final_assessment.indicators.map((indicator, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Component Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Commit Patterns</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-4">
                {data.analysis.final_assessment.component_scores.commit_patterns.toFixed(1)}%
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Commits</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.commit_patterns.commit_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Author Score</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.commit_patterns.details.author_score.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Message Score</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.commit_patterns.details.message_score.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Size Score</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.commit_patterns.details.size_score.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Timing Score</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.commit_patterns.details.timing_score.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Inter-Repository</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-4">
                {data.analysis.final_assessment.component_scores.inter_repository_similarity.toFixed(1)}%
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Files Checked</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.inter_repository_similarity.files_checked}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Search Attempts</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.inter_repository_similarity.search_attempts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Matches</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.inter_repository_similarity.matches.length}</span>
                </div>
                {data.analysis.inter_repository_similarity.high_confidence_matches !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">High-Confidence</span>
                    <span className="text-sm font-medium text-green-600">{data.analysis.inter_repository_similarity.high_confidence_matches}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Intra-Repository</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-4">
                {data.analysis.final_assessment.component_scores.intra_repository_similarity.toFixed(1)}%
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Files Analyzed</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.intra_repository_similarity.file_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Similar Pairs</span>
                  <span className="text-sm font-medium text-gray-900">{data.analysis.intra_repository_similarity.similar_files.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inter-Repository Matches */}
          {data.analysis.inter_repository_similarity.matches.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">External Repository Matches</h2>
              </div>
              <div className="space-y-4">
                {data.analysis.inter_repository_similarity.matches.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">Source:</span>
                          <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">{match.file}</code>
                          {match.language && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{match.language}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">Match:</span>
                          <a 
                            href={match.match_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-red-600 hover:text-red-800 hover:underline font-medium"
                          >
                            {match.match_repo}/{match.match_file}
                          </a>
                        </div>
                      </div>
                      {match.confidence !== undefined && (
                        <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${
                          match.confidence > 0.8 
                            ? 'text-red-700 bg-red-50 border-red-200' 
                            : match.confidence > 0.6 
                            ? 'text-yellow-700 bg-yellow-50 border-yellow-200' 
                            : 'text-blue-700 bg-blue-50 border-blue-200'
                        }`}>
                          {match.confidence > 0.8 && <XCircle className="w-4 h-4 mr-1" />}
                          {match.confidence > 0.6 && match.confidence <= 0.8 && <AlertTriangle className="w-4 h-4 mr-1" />}
                          {match.confidence <= 0.6 && <CheckCircle className="w-4 h-4 mr-1" />}
                          {(match.confidence * 100).toFixed(0)}% confidence
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <span className="text-xs text-gray-500 mb-1 block">Code Snippet:</span>
                      <code className="text-sm text-gray-700 whitespace-pre-wrap break-words">{match.snippet}</code>
                    </div>
                  </div>
                ))}
              </div>
              {data.analysis.inter_repository_similarity.high_confidence_matches && data.analysis.inter_repository_similarity.high_confidence_matches > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">
                      {data.analysis.inter_repository_similarity.high_confidence_matches} high-confidence matches detected
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Similar Files */}
          {data.analysis.intra_repository_similarity.similar_files.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Similar Files Detected</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">File 1</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">File 2</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Similarity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.analysis.intra_repository_similarity.similar_files.map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{file.file1}</code>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{file.file2}</code>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${
                            file.similarity > 0.7 
                              ? 'text-red-700 bg-red-50 border-red-200' 
                              : file.similarity > 0.5 
                              ? 'text-yellow-700 bg-yellow-50 border-yellow-200' 
                              : 'text-green-700 bg-green-50 border-green-200'
                          }`}>
                            {file.similarity > 0.7 && <XCircle className="w-4 h-4 mr-1" />}
                            {file.similarity > 0.5 && file.similarity <= 0.7 && <AlertTriangle className="w-4 h-4 mr-1" />}
                            {file.similarity <= 0.5 && <CheckCircle className="w-4 h-4 mr-1" />}
                            {(file.similarity * 100).toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analysis Quality Summary */}
          {data.analysis.final_assessment.analysis_quality && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Analysis Quality Summary</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.analysis.final_assessment.analysis_quality.commits_analyzed}
                  </div>
                  <p className="text-xs text-gray-600">Commits Analyzed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.analysis.final_assessment.analysis_quality.files_analyzed}
                  </div>
                  <p className="text-xs text-gray-600">Files Analyzed</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {data.analysis.final_assessment.analysis_quality.search_queries_used}
                  </div>
                  <p className="text-xs text-gray-600">Search Queries</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {data.analysis.final_assessment.analysis_quality.high_confidence_matches}
                  </div>
                  <p className="text-xs text-gray-600">High-Conf Matches</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                <span>Analysis completed at {new Date(data.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center">
                <span>Report version: {data.version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}