"use client"

import { useState, useEffect } from 'react';
import { Instrument_Sans } from 'next/font/google';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useParams } from 'next/navigation';

interface Organizer {
  name: string;
  email: string;
  phone: string;
}

interface Deliverable {
  type: string;
  description: string;
}

interface Phase {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  deliverables: Deliverable[];
}

interface Prize {
  title: string;
  description: string;
}

interface Sponsor {
  name: string;
  logo?: string;
}

interface Hackathon {
  admins: string[];
  eventName: string;
  eventTagline: string;
  eventDescription: string;
  eventType: string;
  eventStartDate: string;
  eventEndDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  organisers: Organizer[];
  phases: Phase[];
  prizes: Prize[];
  sponsors: Sponsor[];
  teamSize: string;
  maxTeams: string;
  mode: string;
  hasFee: boolean;
  fee?: string;
  upiId?: string;
  hackCode: string;
}

interface TeamMember {
  name: string;
  email: string;
  phone: string;
  institute: string;
  course: string;
  specialization: string;
  graduatingYear: string;
  location: string;
}

interface RegistrationFormData {
  hackCode: string;
  teamLeader: TeamMember;
  teamName: string;
  teamMembers: TeamMember[];
  transactionId?: string;
}

const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad',
  'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'
];

const RegistrationPageContent = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
    reset,
    setValue
  } = useForm<RegistrationFormData>({
    mode: 'onChange',
    defaultValues: {
      hackCode: params.id as string,
      teamLeader: {
        name: '',
        email: '',
        phone: '',
        institute: '',
        course: '',
        specialization: '',
        graduatingYear: '',
        location: ''
      },
      teamName: '',
      teamMembers: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'teamMembers'
  });

  // Auto-fill email from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email) {
          setValue('teamLeader.email', user.email);
        }
      }
    } catch (error) {
      console.warn('Failed to load user data from localStorage:', error);
    }
  }, [setValue]);

  useEffect(() => {
    const fetchHackathonData = async () => {
      try {
        const hackCode = params.id as string;
        const response = await fetch(
          `https://thecodeworks.in/hatch/fetchhack?hackCode=${hackCode}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch hackathon data');
        }

        const selectedHackathon: Hackathon = await response.json();

        if (!selectedHackathon) {
          throw new Error('Hackathon not found');
        }

        setHackathon(selectedHackathon);
        setTotalTeams(
          Math.floor(Math.random() * parseInt(selectedHackathon.maxTeams) * 0.7)
        );
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred'
        );
        setLoading(false);
      }
    };

    if (params.id) {
      fetchHackathonData();
    }
  }, [params.id]);

  const onSubmit: SubmitHandler<RegistrationFormData> = async (data) => {
    setSubmitting(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('https://thecodeworks.in/hatch/registerteam', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Registration submitted successfully:', result);
      
      alert('Registration submitted successfully!');
      reset();
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit registration. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const addTeamMember = () => {
    if (fields.length < parseInt(hackathon?.teamSize || '4') - 1) {
      append({
        name: '',
        email: '',
        phone: '',
        institute: '',
        course: '',
        specialization: '',
        graduatingYear: '',
        location: ''
      });
    }
  };

  const removeTeamMember = (index: number) => {
    remove(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Hackathon</h3>
          <p className="text-gray-600">Please wait while we fetch the details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.49.901-6.092 2.372M19.5 12a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hackathon Not Found</h2>
          <p className="text-gray-600">The hackathon you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Check if registration is open
  const now = new Date();
  const regStart = new Date(hackathon.registrationStartDate);
  const regEnd = new Date(hackathon.registrationEndDate);

  if (now < regStart) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Opening Soon</h2>
          <p className="text-gray-600 mb-2">Registration for <span className="font-semibold">{hackathon.eventName}</span> opens on</p>
          <p className="text-xl font-semibold text-blue-600">{regStart.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      </div>
    );
  }

  if (now > regEnd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Closed</h2>
          <p className="text-gray-600 mb-2">Registration for <span className="font-semibold">{hackathon.eventName}</span> closed on</p>
          <p className="text-xl font-semibold text-red-600">{regEnd.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      </div>
    );
  }

  if (totalTeams >= parseInt(hackathon.maxTeams)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Full</h2>
          <p className="text-gray-600 mb-4">
            <span className="font-semibold">{hackathon.eventName}</span> has reached its maximum capacity.
          </p>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Maximum teams: <span className="font-semibold text-gray-900">{hackathon.maxTeams}</span></p>
            <p className="text-sm text-gray-600">Current registrations: <span className="font-semibold text-gray-900">{totalTeams}</span></p>
          </div>
        </div>
      </div>
    );
  }
  
  const totalSteps = hackathon.hasFee ? 4 : 3;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">{hackathon.eventName}</h1>
            <p className="text-xl text-gray-600 mb-4">{hackathon.eventTagline}</p>
            <div className="flex justify-center items-center space-x-8">
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Available Spots</p>
                <p className="text-2xl font-bold text-green-600">{parseInt(hackathon.maxTeams) - totalTeams}</p>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{hackathon.maxTeams}</p>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="text-center">
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium">Team Size</p>
                <p className="text-2xl font-bold text-blue-600">{hackathon.teamSize}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex justify-between items-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-semibold text-sm transition-all duration-300 ${
                  step === currentStep 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                    : step < currentStep 
                    ? 'bg-green-600 border-green-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step < currentStep ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <div className={`ml-4 ${step === currentStep ? 'text-blue-600' : step < currentStep ? 'text-green-600' : 'text-gray-500'}`}>
                  <p className="text-sm font-medium">
                    {step === 1 && 'Team Leader'}
                    {step === 2 && 'Team Details'}
                    {step === 3 && (hackathon.hasFee ? 'Payment' : 'Summary')}
                    {step === 4 && 'Summary'}
                  </p>
                </div>
                {index < totalSteps - 1 && (
                  <div className={`flex-1 h-1 mx-6 rounded-full ${
                    step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white shadow-xl rounded-2xl border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-8 sm:p-10">
              {/* Step 1: Team Leader Details */}
              {currentStep === 1 && (
                <div>
                  <div className="border-b border-gray-200 pb-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Team Leader Information</h2>
                    <p className="text-gray-600 mt-2">Please provide the team leader's details. This person will be the primary contact for the team.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <div>
                      <label htmlFor="teamLeader.name" className="block text-sm font-semibold text-gray-900 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="teamLeader.name"
                        {...register('teamLeader.name', { required: 'Name is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.name ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.teamLeader?.name && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.email" className="block text-sm font-semibold text-gray-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="teamLeader.email"
                        {...register('teamLeader.email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.email ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="your.email@example.com"
                      />
                      {errors.teamLeader?.email && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.phone" className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="teamLeader.phone"
                        {...register('teamLeader.phone', {
                          required: 'Phone number is required',
                          pattern: {
                            value: /^[0-9]{10}$/,
                            message: 'Invalid phone number (10 digits required)'
                          }
                        })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="9876543210"
                      />
                      {errors.teamLeader?.phone && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.phone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.institute" className="block text-sm font-semibold text-gray-900 mb-2">
                        Institute Name *
                      </label>
                      <input
                        type="text"
                        id="teamLeader.institute"
                        {...register('teamLeader.institute', { required: 'Institute name is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.institute ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Your college/university name"
                      />
                      {errors.teamLeader?.institute && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.institute.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.course" className="block text-sm font-semibold text-gray-900 mb-2">
                        Course *
                      </label>
                      <input
                        type="text"
                        id="teamLeader.course"
                        {...register('teamLeader.course', { required: 'Course is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.course ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="e.g., B.Tech, MBA, BCA"
                      />
                      {errors.teamLeader?.course && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.course.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.specialization" className="block text-sm font-semibold text-gray-900 mb-2">
                        Specialization *
                      </label>
                      <input
                        type="text"
                        id="teamLeader.specialization"
                        {...register('teamLeader.specialization', { required: 'Specialization is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                          errors.teamLeader?.specialization ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="e.g., Computer Science, Marketing"
                      />
                      {errors.teamLeader?.specialization && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.specialization.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.graduatingYear" className="block text-sm font-semibold text-gray-900 mb-2">
                        Graduating Year *
                      </label>
                      <select
                        id="teamLeader.graduatingYear"
                        {...register('teamLeader.graduatingYear', { required: 'Graduating year is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white ${
                          errors.teamLeader?.graduatingYear ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Select Graduating Year</option>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                          <option key={year} value={year.toString()}>
                            {year}
                          </option>
                        ))}
                      </select>
                      {errors.teamLeader?.graduatingYear && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.graduatingYear.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="teamLeader.location" className="block text-sm font-semibold text-gray-900 mb-2">
                        Location (City) *
                      </label>
                      <select
                        id="teamLeader.location"
                        {...register('teamLeader.location', { required: 'Location is required' })}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white ${
                          errors.teamLeader?.location ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="">Select City</option>
                        {INDIAN_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      {errors.teamLeader?.location && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.teamLeader.location.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Team Details */}
              {currentStep === 2 && (
                <div>
                  <div className="border-b border-gray-200 pb-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Team Configuration</h2>
                    <p className="text-gray-600 mt-2">Set up your team name and add team members. Maximum team size is {hackathon.teamSize} members including the team leader.</p>
                  </div>
                  
                  <div className="mb-8">
                    <label htmlFor="teamName" className="block text-sm font-semibold text-gray-900 mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      id="teamName"
                      {...register('teamName', { required: 'Team name is required' })}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                        errors.teamName ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter your awesome team name"
                    />
                    {errors.teamName && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.teamName.message}
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Team Members</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Current team size: {fields.length + 1} / {hackathon.teamSize}
                        </p>
                      </div>
                      {fields.length < parseInt(hackathon.teamSize) - 1 && (
                        <button
                          type="button"
                          onClick={addTeamMember}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Add Member
                        </button>
                      )}
                    </div>

                    {fields.length === 0 && (
                      <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No team members added yet</h4>
                        <p className="text-gray-600">Click "Add Member" to start building your team!</p>
                      </div>
                    )}

                    <div className="space-y-6">
                      {fields.map((member, index) => (
                        <div key={member.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">Member {index + 1}</h4>
                              <p className="text-sm text-gray-500">Team member information</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTeamMember(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                              <label htmlFor={`teamMembers.${index}.name`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Full Name *
                              </label>
                              <input
                                type="text"
                                id={`teamMembers.${index}.name`}
                                {...register(`teamMembers.${index}.name`, { required: 'Name is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.name ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="Enter full name"
                              />
                              {errors.teamMembers?.[index]?.name && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.name?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.email`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Email Address *
                              </label>
                              <input
                                type="email"
                                id={`teamMembers.${index}.email`}
                                {...register(`teamMembers.${index}.email`, {
                                  required: 'Email is required',
                                  pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: 'Invalid email address'
                                  }
                                })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.email ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="email@example.com"
                              />
                              {errors.teamMembers?.[index]?.email && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.email?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.phone`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Phone Number *
                              </label>
                              <input
                                type="tel"
                                id={`teamMembers.${index}.phone`}
                                {...register(`teamMembers.${index}.phone`, {
                                  required: 'Phone number is required',
                                  pattern: {
                                    value: /^[0-9]{10}$/,
                                    message: 'Invalid phone number (10 digits required)'
                                  }
                                })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.phone ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="9876543210"
                              />
                              {errors.teamMembers?.[index]?.phone && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.phone?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.institute`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Institute Name *
                              </label>
                              <input
                                type="text"
                                id={`teamMembers.${index}.institute`}
                                {...register(`teamMembers.${index}.institute`, { required: 'Institute name is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.institute ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="College/University name"
                              />
                              {errors.teamMembers?.[index]?.institute && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.institute?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.course`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Course *
                              </label>
                              <input
                                type="text"
                                id={`teamMembers.${index}.course`}
                                {...register(`teamMembers.${index}.course`, { required: 'Course is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.course ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="e.g., B.Tech, MBA"
                              />
                              {errors.teamMembers?.[index]?.course && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.course?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.specialization`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Specialization *
                              </label>
                              <input
                                type="text"
                                id={`teamMembers.${index}.specialization`}
                                {...register(`teamMembers.${index}.specialization`, { required: 'Specialization is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                                  errors.teamMembers?.[index]?.specialization ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                                placeholder="e.g., Computer Science"
                              />
                              {errors.teamMembers?.[index]?.specialization && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.specialization?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.graduatingYear`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Graduating Year *
                              </label>
                              <select
                                id={`teamMembers.${index}.graduatingYear`}
                                {...register(`teamMembers.${index}.graduatingYear`, { required: 'Graduating year is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white ${
                                  errors.teamMembers?.[index]?.graduatingYear ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                              >
                                <option value="">Select Year</option>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                ))}
                              </select>
                              {errors.teamMembers?.[index]?.graduatingYear && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.graduatingYear?.message}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`teamMembers.${index}.location`} className="block text-sm font-semibold text-gray-900 mb-2">
                                Location (City) *
                              </label>
                              <select
                                id={`teamMembers.${index}.location`}
                                {...register(`teamMembers.${index}.location`, { required: 'Location is required' })}
                                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white ${
                                  errors.teamMembers?.[index]?.location ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                                }`}
                              >
                                <option value="">Select City</option>
                                {INDIAN_CITIES.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                              </select>
                              {errors.teamMembers?.[index]?.location && (
                                <p className="mt-2 text-sm text-red-600">{errors.teamMembers[index]?.location?.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment (only if hasFee is true) */}
              {currentStep === 3 && hackathon.hasFee && (
                <div>
                  <div className="border-b border-gray-200 pb-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Payment Information</h2>
                    <p className="text-gray-600 mt-2">Complete your registration by making the payment and providing the transaction details.</p>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-8 mb-8 border border-blue-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-6 flex-1">
                        <h3 className="text-xl font-semibold text-blue-900 mb-3">Payment Instructions</h3>
                        <div className="space-y-3">
                          <p className="text-blue-800">
                            Please transfer the registration fee of <span className="font-bold text-2xl">₹{hackathon.fee}</span> to the following UPI ID:
                          </p>
                          <div className="bg-white rounded-lg p-4 border border-blue-300">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-lg font-bold text-blue-900">{hackathon.upiId}</span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(hackathon.upiId || '')}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Copy UPI ID
                              </button>
                            </div>
                          </div>
                          <div className="text-blue-800">
                            <p className="mb-2">📋 <strong>Payment Steps:</strong></p>
                            <ol className="list-decimal list-inside space-y-1 text-sm ml-4">
                              <li>Open your UPI app (PhonePe, GooglePay, Paytm, etc.)</li>
                              <li>Enter the above UPI ID or scan QR code</li>
                              <li>Enter amount: ₹{hackathon.fee}</li>
                              <li>Add remark: "{hackathon.eventName} Registration"</li>
                              <li>Complete the payment</li>
                              <li>Note down the transaction ID and enter below</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="transactionId" className="block text-sm font-semibold text-gray-900 mb-2">
                      Transaction ID / Reference Number *
                    </label>
                    <input
                      type="text"
                      id="transactionId"
                      {...register('transactionId', { required: 'Transaction ID is required' })}
                      className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500 ${
                        errors.transactionId ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Enter your UPI transaction ID"
                    />
                    {errors.transactionId && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.transactionId.message}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      💡 You can find the transaction ID in your UPI app's transaction history or payment confirmation message.
                    </p>
                  </div>
                </div>
              )}

              {/* Final Step: Enhanced Summary */}
              {currentStep === (hackathon.hasFee ? 4 : 3) && (
                <div>
                  <div className="border-b border-gray-200 pb-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Registration Summary</h2>
                    <p className="text-gray-600 mt-2">Please review all the information before submitting your registration.</p>
                  </div>
                  
                  {/* Hackathon Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Event Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-700">Event Name</p>
                        <p className="text-blue-900 font-semibold">{hackathon.eventName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Event Type</p>
                        <p className="text-blue-900">{hackathon.eventType}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Mode</p>
                        <p className="text-blue-900">{hackathon.mode}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Event Duration</p>
                        <p className="text-blue-900">
                          {new Date(hackathon.eventStartDate).toLocaleDateString()} - {new Date(hackathon.eventEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Team Leader Details */}
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Team Leader Details</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
                        <p className="text-gray-900 font-semibold">{watch('teamLeader.name')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Email Address</p>
                        <p className="text-gray-900">{watch('teamLeader.email')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Phone Number</p>
                        <p className="text-gray-900">{watch('teamLeader.phone')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Institute</p>
                        <p className="text-gray-900">{watch('teamLeader.institute')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Course</p>
                        <p className="text-gray-900">{watch('teamLeader.course')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Specialization</p>
                        <p className="text-gray-900">{watch('teamLeader.specialization')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Graduating Year</p>
                        <p className="text-gray-900">{watch('teamLeader.graduatingYear')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Location</p>
                        <p className="text-gray-900">{watch('teamLeader.location')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Team Details */}
                  <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">Team Information</h3>
                        <p className="text-sm text-gray-600">Total members: {fields.length + 1}</p>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-500 mb-1">Team Name</p>
                        <p className="text-xl font-bold text-gray-900">{watch('teamName')}</p>
                      </div>
                    </div>

                    {watch('teamMembers').length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">Team Members</h4>
                        <div className="space-y-4">
                          {watch('teamMembers').map((member, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center mb-3">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                                </div>
                                <h5 className="font-semibold text-gray-900">{member.name}</h5>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Email: </span>
                                  <span className="text-gray-900">{member.email}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Phone: </span>
                                  <span className="text-gray-900">{member.phone}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Institute: </span>
                                  <span className="text-gray-900">{member.institute}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Course: </span>
                                  <span className="text-gray-900">{member.course}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Specialization: </span>
                                  <span className="text-gray-900">{member.specialization}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Year: </span>
                                  <span className="text-gray-900">{member.graduatingYear}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Location: </span>
                                  <span className="text-gray-900">{member.location}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-yellow-800 font-medium">Solo Team</span>
                        </div>
                        <p className="text-yellow-700 mt-1 text-sm">You're registering as a single-member team (just the team leader).</p>
                      </div>
                    )}
                  </div>

                  {/* Payment Details (if applicable) */}
                  {hackathon.hasFee && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Registration Fee</p>
                          <p className="text-2xl font-bold text-green-600">₹{hackathon.fee}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Payment Method</p>
                          <p className="text-gray-900">UPI Payment</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-1">Transaction ID</p>
                          <p className="text-gray-900 font-mono bg-gray-50 px-3 py-1 rounded">{watch('transactionId')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Terms and Conditions */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Important Notes</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• By submitting this registration, you agree to the hackathon's terms and conditions</li>
                          <li>• All information provided must be accurate and complete</li>
                          <li>• Registration confirmation will be sent to the team leader's email</li>
                          {hackathon.hasFee && <li>• Payment verification may take 24-48 hours</li>}
                          <li>• Team details can be modified until {new Date(hackathon.registrationEndDate).toLocaleDateString()}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Footer */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous Step
                  </button>
                ) : (
                  <div></div>
                )}

                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    disabled={!isValid}
                    className={`inline-flex items-center px-6 py-3 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isValid 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    Continue
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!isValid || submitting}
                    className={`inline-flex items-center px-8 py-4 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      !isValid || submitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Submitting Registration...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Complete Registration
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Progress Indicator */}
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  ></div>
                </div>
                <p className="text-center text-sm text-gray-500 mt-2">
                  Step {currentStep} of {totalSteps}
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function RegistrationPage() {
  return (
    <div className={instrumentSans.className}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Registration Form</h3>
          <p className="text-gray-600">Please wait while we prepare everything for you...</p>
        </div>
      </div>
    }>
        <RegistrationPageContent />
      </Suspense>
    </div>
  );
}