'use client';

import React, { useState } from 'react';
import { Instrument_Sans } from 'next/font/google';
import Navbar from '../../components/navbar';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Users, Trophy, Building, Clock, FileText, ArrowLeft, ArrowRight, Loader2} from 'lucide-react';

// TypeScript interfaces
interface Organiser {
  name: string;
  email: string;
  phone: string;
}

interface Prize {
  title: string;
  description: string;
}

interface Sponsor {
  name: string;
  tier?: 'platinum' | 'gold' | 'silver' | 'bronze';
  logo?: string;
  website?: string;
  showcase?: {
    youtubeUrl: string;
    title: string;
    description: string;
  };
}

interface Deliverable {
  type: 'canva' | 'github' | 'drive' | 'mvp' | 'other';
  description: string;
}

interface Phase {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  deliverables: Deliverable[];
}

interface EventFormData {
  // Event Details
  eventName: string;
  eventTagline: string;
  eventDescription: string;
  eventType: 'hackathon' | 'quiz' | 'codeathon' | 'ideathon';
  mode: 'online' | 'offline';
  imageUrl: string;
  
  // Organiser Details
  organisers: Organiser[];
  
  // Event Timeline
  eventStartDate: string;
  eventEndDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  
  // Participation Details
  maxTeams: number;
  teamSize: number;
  hasFee: boolean;
  fee?: number;
  upiId?: string;
  
  // Prizes & Rewards
  prizes: Prize[];
  
  // Sponsors
  sponsors: Sponsor[];
  
  // Event Phases
  phases: Phase[];
}

interface ApiResponse {
  message: string;
  hackCode: string;
  id: string;
}

const steps = [
  { id: 1, title: 'Event Details', icon: FileText },
  { id: 2, title: 'Organisers', icon: Users },
  { id: 3, title: 'Timeline', icon: Calendar },
  { id: 4, title: 'Participation', icon: Users },
  { id: 5, title: 'Prizes', icon: Trophy },
  { id: 6, title: 'Sponsors', icon: Building },
  { id: 7, title: 'Phases', icon: Clock },
  { id: 8, title: 'Review', icon: FileText },
];

export default function CreateEventForm() {
  return (
    <div className={instrumentSans.className}>
      <CreateEventFormContent />
    </div>
  );
}

function CreateEventFormContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionResult, setSubmissionResult] = useState<ApiResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, watch, formState: { errors }, trigger, getValues } = useForm<EventFormData>({
    defaultValues: {
      organisers: [{ name: '', email: '', phone: '' }],
      prizes: [{ title: '', description: '' }],
      sponsors: [{ name: '', tier: 'bronze', logo: '', website: '', showcase: { youtubeUrl: '', title: '', description: '' } }],
      phases: [{ 
        name: '', 
        description: '', 
        startDate: '', 
        endDate: '', 
        deliverables: [{ type: 'github', description: '' }] 
      }],
      hasFee: false,
      mode: 'online',
      eventType: 'hackathon'
    }
  });

  const { fields: organiserFields, append: appendOrganiser, remove: removeOrganiser } = useFieldArray({
    control,
    name: 'organisers'
  });

  const { fields: prizeFields, append: appendPrize, remove: removePrize } = useFieldArray({
    control,
    name: 'prizes'
  });

  const { fields: sponsorFields, append: appendSponsor, remove: removeSponsor } = useFieldArray({
    control,
    name: 'sponsors'
  });

  const { fields: phaseFields, append: appendPhase, remove: removePhase } = useFieldArray({
    control,
    name: 'phases'
  });

  const hasFee = watch('hasFee');

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await fetch('https://thecodeworks.in/hatch/hack-create', {
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

      const result: ApiResponse = await response.json();
      setSubmissionResult(result);
      console.log('Event created successfully:', result);
      window.location.href="/home";
      
    } catch (error) {
      console.error('Error creating event:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    return (
      <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Event Created Successfully!</h1>
              <p className="text-gray-600 mt-2">{submissionResult.message}</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Event Details:</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Hack Code:</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-mono">
                    {submissionResult.hackCode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Event ID:</span>
                  <span className="text-gray-600 font-mono">{submissionResult.id}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setSubmissionResult(null);
                  setCurrentStep(1);
                  setSubmitError(null);
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Another Event
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="text-gray-900 font-semibold text-center text-4xl mb-8">Create an Event</div>
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="relative">
            {/* Left Arrow - Made darker and more visible */}
            <button
            onClick={() => {
                document.getElementById("progressBar")?.scrollBy({ left: -150, behavior: "smooth" });
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900 transition-colors z-10"
            >
            <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Container */}
            <div
            id="progressBar"
            className="flex items-center space-x-4 overflow-x-auto px-10 scroll-smooth scrollbar-hide"
            >
            {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                <div key={step.id} className="flex items-center flex-shrink-0">
                    <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                        isCompleted
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    >
                    <Icon className="w-5 h-5" />
                    </div>
                    <div className="ml-3 whitespace-nowrap">
                    <p
                        className={`text-sm font-medium ${
                        isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                    >
                        {step.title}
                    </p>
                    </div>
                    {index < steps.length - 1 && (
                    <div
                        className={`w-8 h-1 mx-4 flex-shrink-0 ${
                        isCompleted ? "bg-green-500" : "bg-gray-200"
                        }`}
                    />
                    )}
                </div>
                );
            })}
            </div>

            {/* Right Arrow - Made darker and more visible */}
            <button
            onClick={() => {
                document.getElementById("progressBar")?.scrollBy({ left: 150, behavior: "smooth" });
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900 transition-colors z-10"
            >
            <ArrowRight className="w-4 h-4" />
            </button>
        </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error creating event</h3>
                <div className="mt-2 text-sm text-red-700">
                  {submitError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            
            {/* Step 1: Event Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Details</h2>
                
                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-2">Event Name *</label>
                  <Controller
                    name="eventName"
                    control={control}
                    rules={{ required: 'Event name is required' }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500
                        border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter event name"
                      />
                    )}
                  />
                  {errors.eventName && <p className="mt-1 text-sm text-red-600">{errors.eventName.message}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-2">Event Tagline *</label>
                  <Controller
                    name="eventTagline"
                    control={control}
                    rules={{ required: 'Event tagline is required' }}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500
                        border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter a catchy tagline"
                      />
                    )}
                  />
                  {errors.eventTagline && <p className="mt-1 text-sm text-red-600">{errors.eventTagline.message}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-2">Event Description *</label>
                  <Controller
                    name="eventDescription"
                    control={control}
                    rules={{ required: 'Event description is required' }}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={4}
                        className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500
                        border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="Describe your event..."
                      />
                    )}
                  />
                  {errors.eventDescription && <p className="mt-1 text-sm text-red-600">{errors.eventDescription.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Event Type *</label>
                    <Controller
                      name="eventType"
                      control={control}
                      rules={{ required: 'Event type is required' }}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        >
                          <option value="hackathon">Hackathon</option>
                          <option value="quiz">Quiz</option>
                          <option value="codeathon">Codeathon</option>
                          <option value="ideathon">Ideathon</option>
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Event Mode *</label>
                    <Controller
                      name="mode"
                      control={control}
                      render={({ field }) => (
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="online"
                              checked={field.value === 'online'}
                              onChange={() => field.onChange('online')}
                              className="mr-2"
                            />
                            <span className="text-black">Online</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="offline"
                              checked={field.value === 'offline'}
                              onChange={() => field.onChange('offline')}
                              className="mr-2"
                            />
                            <span className="text-black">Offline</span>
                          </label>
                        </div>
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-800 mb-2">Event Image URL</label>
                  <Controller
                    name="imageUrl"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="url"
                        className="w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500
                        border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/event-image.jpg"
                      />
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Organisers */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Organiser Details</h2>
                
                {organiserFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-black">Organiser {index + 1}</h3>
                      {organiserFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOrganiser(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Name *</label>
                        <Controller
                          name={`organisers.${index}.name`}
                          control={control}
                          rules={{ required: 'Organiser name is required' }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="John Doe"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Email *</label>
                        <Controller
                          name={`organisers.${index}.email`}
                          control={control}
                          rules={{ 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="email"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="john@example.com"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Phone *</label>
                        <Controller
                          name={`organisers.${index}.phone`}
                          control={control}
                          rules={{ required: 'Phone number is required' }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="tel"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="+91 9876543210"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => appendOrganiser({ name: '', email: '', phone: '' })}
                  className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Organiser
                </button>
              </div>
            )}

            {/* Step 3: Timeline */}
            {currentStep === 3 && (
                <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Timeline</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Event Start Date *</label>
                    <Controller
                        name="eventStartDate"
                        control={control}
                        rules={{ required: 'Event start date is required' }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                        )}
                    />
                    {errors.eventStartDate && <p className="mt-1 text-sm text-red-600">{errors.eventStartDate.message}</p>}
                    </div>
                    
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Event End Date *</label>
                    <Controller
                        name="eventEndDate"
                        control={control}
                        rules={{ required: 'Event end date is required' }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                        )}
                    />
                    {errors.eventEndDate && <p className="mt-1 text-sm text-red-600">{errors.eventEndDate.message}</p>}
                    </div>
                    
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Registration Start Date *</label>
                    <Controller
                        name="registrationStartDate"
                        control={control}
                        rules={{ required: 'Registration start date is required' }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                        )}
                    />
                    {errors.registrationStartDate && <p className="mt-1 text-sm text-red-600">{errors.registrationStartDate.message}</p>}
                    </div>
                    
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Registration End Date *</label>
                    <Controller
                        name="registrationEndDate"
                        control={control}
                        rules={{ required: 'Registration end date is required' }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="datetime-local"
                            className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                        )}
                    />
                    {errors.registrationEndDate && <p className="mt-1 text-sm text-red-600">{errors.registrationEndDate.message}</p>}
                    </div>
                </div>
                </div>
            )}

            {/* Step 4: Participation Details */}
            {currentStep === 4 && (
                <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Participation Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Max Number of Teams *</label>
                    <Controller
                        name="maxTeams"
                        control={control}
                        rules={{ required: 'Max teams is required', min: 1 }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="100"
                        />
                        )}
                    />
                    {errors.maxTeams && <p className="mt-1 text-sm text-red-600">{errors.maxTeams.message}</p>}
                    </div>
                    
                    <div>
                    <label className="block text-base font-semibold text-gray-800 mb-2">Team Size *</label>
                    <Controller
                        name="teamSize"
                        control={control}
                        rules={{ required: 'Team size is required', min: 1 }}
                        render={({ field }) => (
                        <input
                            {...field}
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="4"
                        />
                        )}
                    />
                    {errors.teamSize && <p className="mt-1 text-sm text-red-600">{errors.teamSize.message}</p>}
                    </div>
                </div>
                
                <div>
                    <label className="flex items-center">
                    <Controller
                        name="hasFee"
                        control={control}
                        render={({ field }) => (
                        <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="mr-2"
                        />
                        )}
                    />
                    <span className="text-base font-semibold text-gray-800">Event has registration fee</span>
                    </label>
                </div>
                
                {hasFee && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Registration Fee *</label>
                        <Controller
                        name="fee"
                        control={control}
                        rules={{ required: hasFee ? 'Fee is required' : false, min: 0 }}
                        render={({ field }) => (
                            <input
                            {...field}
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="500"
                            />
                        )}
                        />
                        {errors.fee && <p className="mt-1 text-sm text-red-600">{errors.fee.message}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">UPI ID *</label>
                        <Controller
                        name="upiId"
                        control={control}
                        rules={{ required: hasFee ? 'UPI ID is required' : false }}
                        render={({ field }) => (
                            <input
                            {...field}
                            type="text"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="yourname@upi"
                            />
                        )}
                        />
                        {errors.upiId && <p className="mt-1 text-sm text-red-600">{errors.upiId.message}</p>}
                    </div>
                    </div>
                )}
                </div>
            )}

            {/* Step 5: Prizes */}
            {currentStep === 5 && (
                <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Prizes & Rewards</h2>
                
                {prizeFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 relative">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-black">Prize {index + 1}</h3>
                        {prizeFields.length > 1 && (
                        <button
                            type="button"
                            onClick={() => removePrize(index)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Prize Title *</label>
                        <Controller
                            name={`prizes.${index}.title`}
                            control={control}
                            rules={{ required: 'Prize title is required' }}
                            render={({ field }) => (
                            <input
                                {...field}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="1st Prize"
                            />
                            )}
                        />
                        </div>
                        
                        <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Description *</label>
                        <Controller
                            name={`prizes.${index}.description`}
                            control={control}
                            rules={{ required: 'Prize description is required' }}
                            render={({ field }) => (
                            <input
                                {...field}
                                type="text"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="₹50,000 cash prize"
                            />
                            )}
                        />
                        </div>
                    </div>
                    </div>
                ))}
                
                <button
                    type="button"
                    onClick={() => appendPrize({ title: '', description: '' })}
                    className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Prize
                </button>
                </div>
            )}

            {/* Step 6: Sponsors */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Sponsors & Partner Showcase</h2>
                
                {sponsorFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-6 relative bg-gray-50">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-black">Sponsor {index + 1}</h3>
                      {sponsorFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSponsor(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    {/* Basic Sponsor Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Sponsor Name *</label>
                        <Controller
                          name={`sponsors.${index}.name`}
                          control={control}
                          rules={{ required: 'Sponsor name is required' }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="Company name"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Sponsorship Tier</label>
                        <Controller
                          name={`sponsors.${index}.tier`}
                          control={control}
                          render={({ field }) => (
                            <select
                              {...field}
                              className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                            >
                              <option value="bronze">Bronze</option>
                              <option value="silver">Silver</option>
                              <option value="gold">Gold</option>
                              <option value="platinum">Platinum</option>
                            </select>
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Logo URL</label>
                        <Controller
                          name={`sponsors.${index}.logo`}
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="url"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://sponsor-logo.com/logo.png"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Website URL</label>
                        <Controller
                          name={`sponsors.${index}.website`}
                          control={control}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="url"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="https://sponsor-website.com"
                            />
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Sponsor Showcase Section */}
                    <div className="border-t pt-6">
                      <h4 className="text-md font-bold text-gray-800 mb-4">📺 Partner Showcase (Optional)</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Add a YouTube video to showcase this partner's involvement or message for the hackathon.
                      </p>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-2">YouTube Video URL</label>
                          <Controller
                            name={`sponsors.${index}.showcase.youtubeUrl`}
                            control={control}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="url"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                              />
                            )}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Paste the YouTube video URL that showcases this partner's message or involvement.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-base font-semibold text-gray-800 mb-2">Showcase Title</label>
                            <Controller
                              name={`sponsors.${index}.showcase.title`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  placeholder="Welcome Message from [Partner Name]"
                                />
                              )}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-base font-semibold text-gray-800 mb-2">Description</label>
                            <Controller
                              name={`sponsors.${index}.showcase.description`}
                              control={control}
                              render={({ field }) => (
                                <input
                                  {...field}
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  placeholder="Brief description of the showcase"
                                />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => appendSponsor({ name: '', tier: 'bronze', logo: '', website: '', showcase: { youtubeUrl: '', title: '', description: '' } })}
                  className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Sponsor
                </button>
              </div>
            )}

            {/* Step 7: Event Phases */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Phases</h2>
                
                {phaseFields.map((phaseField, phaseIndex) => (
                  <div key={phaseField.id} className="border rounded-lg p-6 relative">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-black">Phase {phaseIndex + 1}</h3>
                      {phaseFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhase(phaseIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 mb-6">
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Phase Name *</label>
                        <Controller
                          name={`phases.${phaseIndex}.name`}
                          control={control}
                          rules={{ required: 'Phase name is required' }}
                          render={({ field }) => (
                            <input
                              {...field}
                              type="text"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="Ideation Phase"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-base font-semibold text-gray-800 mb-2">Phase Description *</label>
                        <Controller
                          name={`phases.${phaseIndex}.description`}
                          control={control}
                          rules={{ required: 'Phase description is required' }}
                          render={({ field }) => (
                            <textarea
                              {...field}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              placeholder="Describe this phase..."
                            />
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-2">Phase Start Date *</label>
                          <Controller
                            name={`phases.${phaseIndex}.startDate`}
                            control={control}
                            rules={{ required: 'Phase start date is required' }}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="datetime-local"
                                className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              />
                            )}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-base font-semibold text-gray-800 mb-2">Phase End Date *</label>
                          <Controller
                            name={`phases.${phaseIndex}.endDate`}
                            control={control}
                            rules={{ required: 'Phase end date is required' }}
                            render={({ field }) => (
                              <input
                                {...field}
                                type="datetime-local"
                                className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-md font-bold text-gray-800 mb-4">Deliverables</h4>
                      <Controller
                        name={`phases.${phaseIndex}.deliverables`}
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-4">
                            {field.value.map((deliverable, deliverableIndex) => (
                              <div key={deliverableIndex} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-4">
                                  <h5 className="text-sm font-bold text-black">Deliverable {deliverableIndex + 1}</h5>
                                  {field.value.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newDeliverables = [...field.value];
                                        newDeliverables.splice(deliverableIndex, 1);
                                        field.onChange(newDeliverables);
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-base font-semibold text-gray-800 mb-2">Type *</label>
                                    <select
                                      value={deliverable.type}
                                      onChange={(e) => {
                                        const newDeliverables = [...field.value];
                                        newDeliverables[deliverableIndex] = {
                                          ...newDeliverables[deliverableIndex],
                                          type: e.target.value as any
                                        };
                                        field.onChange(newDeliverables);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 focus:border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    >
                                      <option value="github">GitHub Repo</option>
                                      <option value="canva">Canva Link</option>
                                      <option value="drive">Google Drive Content</option>
                                      <option value="mvp">MVP Link</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-base font-semibold text-gray-800 mb-2">Description *</label>
                                    <input
                                      type="text"
                                      value={deliverable.description}
                                      onChange={(e) => {
                                        const newDeliverables = [...field.value];
                                        newDeliverables[deliverableIndex] = {
                                          ...newDeliverables[deliverableIndex],
                                          description: e.target.value
                                        };
                                        field.onChange(newDeliverables);
                                      }}
                                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-black placeholder-gray-500
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                      placeholder="Describe the deliverable"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newDeliverables = [...field.value, { type: 'github', description: '' }];
                                field.onChange(newDeliverables);
                              }}
                              className="flex items-center px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Deliverable
                            </button>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => appendPhase({ 
                    name: '', 
                    description: '', 
                    startDate: '', 
                    endDate: '', 
                    deliverables: [{ type: 'github', description: '' }] 
                  })}
                  className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Phase
                </button>
              </div>
            )}

            {/* Step 8: Review */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Event</h2>
                
                <div className="space-y-6">
                  {/* Event Details Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Event Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Name:</strong> {watch('eventName')}</div>
                      <div><strong>Type:</strong> {watch('eventType')}</div>
                      <div><strong>Mode:</strong> {watch('mode')}</div>
                      <div><strong>Tagline:</strong> {watch('eventTagline')}</div>
                      <div className="md:col-span-2"><strong>Description:</strong> {watch('eventDescription')}</div>
                    </div>
                  </div>

                  {/* Organisers Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Organisers</h3>
                    <div className="space-y-2">
                      {watch('organisers')?.map((organiser, index) => (
                        <div key={index} className="text-sm">
                          <strong>{organiser.name}</strong> - {organiser.email} - {organiser.phone}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Event Start:</strong> {watch('eventStartDate')}</div>
                      <div><strong>Event End:</strong> {watch('eventEndDate')}</div>
                      <div><strong>Registration Start:</strong> {watch('registrationStartDate')}</div>
                      <div><strong>Registration End:</strong> {watch('registrationEndDate')}</div>
                    </div>
                  </div>

                  {/* Participation Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Participation Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div><strong>Max Teams:</strong> {watch('maxTeams')}</div>
                      <div><strong>Team Size:</strong> {watch('teamSize')}</div>
                      <div><strong>Has Fee:</strong> {watch('hasFee') ? 'Yes' : 'No'}</div>
                      {watch('hasFee') && (
                        <>
                          <div><strong>Fee:</strong> ₹{watch('fee')}</div>
                          <div><strong>UPI ID:</strong> {watch('upiId')}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Prizes Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Prizes</h3>
                    <div className="space-y-2">
                      {watch('prizes')?.map((prize, index) => (
                        <div key={index} className="text-sm">
                          <strong>{prize.title}:</strong> {prize.description}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sponsors Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Sponsors & Partner Showcases</h3>
                    <div className="space-y-4">
                      {watch('sponsors')?.map((sponsor, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <strong>{sponsor.name}</strong>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              sponsor.tier === 'platinum' ? 'bg-gray-800 text-white' :
                              sponsor.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                              sponsor.tier === 'silver' ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {sponsor.tier?.toUpperCase() || 'BRONZE'}
                            </span>
                          </div>
                          {sponsor.website && (
                            <p className="text-gray-600 mb-1">
                              <strong>Website:</strong> <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{sponsor.website}</a>
                            </p>
                          )}
                          {sponsor.showcase?.youtubeUrl && (
                            <div className="mt-2 p-3 bg-blue-50 rounded">
                              <p className="text-blue-800 font-medium">📺 Showcase: {sponsor.showcase.title}</p>
                              {sponsor.showcase.description && (
                                <p className="text-blue-600 text-xs mt-1">{sponsor.showcase.description}</p>
                              )}
                              <p className="text-blue-600 text-xs mt-1">
                                <strong>Video:</strong> {sponsor.showcase.youtubeUrl}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phases Preview */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Event Phases</h3>
                    <div className="space-y-4">
                      {watch('phases')?.map((phase, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4">
                          <div className="text-sm">
                            <strong>{phase.name}</strong>
                            <p className="text-gray-600">{phase.description}</p>
                            <p><strong>Duration:</strong> {phase.startDate} to {phase.endDate}</p>
                            <div className="mt-2">
                              <strong>Deliverables:</strong>
                              <ul className="list-disc list-inside ml-4">
                                {phase.deliverables?.map((deliverable, dIndex) => (
                                  <li key={dIndex}>
                                    {deliverable.type}: {deliverable.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center px-6 py-2 rounded-lg ${
                    currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
                >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
                </button>

                {currentStep < 8 ? (
                <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                </button>
                ) : (
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center px-8 py-2 rounded-lg transition-colors ${
                      isSubmitting 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Event...
                      </>
                    ) : (
                      <>
                        Submit Event
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                </button>
                )}
            </div>
            </form>
        </div>
        </div>
    </div>
    </>
    );
}