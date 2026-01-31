'use client';

import { useState, useEffect } from 'react';
import { Instrument_Sans } from 'next/font/google';
import { Bricolage_Grotesque } from "next/font/google";
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from "next/image";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAqYd-BLAdcsvD-03WByZfcsoSvoGzdKkQ",
  authDomain: "hatch-synap.firebaseapp.com",
  projectId: "hatch-synap",
  storageBucket: "hatch-synap.firebasestorage.app",
  messagingSenderId: "900042075523",
  appId: "1:900042075523:web:786e5cd5f5f63e977c9ab6",
  measurementId: "G-KE5KPPWH9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const API_BASE_URL = 'http://localhost:5000';

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // choose weights you need
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

function AuthPage() {
  return (
    <div className={instrumentSans.className}>
      <AuthPageContent />
    </div>
  );
}

function AuthPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const router = useRouter();

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation for signup
    if (isSignup) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setIsLoading(false);
        return;
      }
    }
    try {
      const endpoint = isSignup ? '/signup' : '/login';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `${isSignup ? 'Signup' : 'Login'} failed`);
      }

      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      console.log("data_token:", data.token)

      console.log(`${isSignup ? 'Signup' : 'Login'} successful:`, data);
      router.push('/home');
    } catch (error: any) {
      console.error(`${isSignup ? 'Signup' : 'Login'} error:`, error);
      setError(error.message || `Failed to ${isSignup ? 'sign up' : 'sign in'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Google login successful:', result.user);
      
      const googleEmail = result.user.email;
      const firebaseUid = result.user.uid;
      
      if (!googleEmail) {
        throw new Error('No email found in Google account');
      }

      // Try to login first (in case user already exists)
      try {
        const loginResponse = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: googleEmail,
            password: firebaseUid
          }),
        });
        console.log('email :', googleEmail, " and password :", firebaseUid);
        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          localStorage.setItem('auth_token', loginData.token);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          console.log('Google user logged in successfully');
          router.push('/home');
          return;
        }
      } catch (loginError) {
        console.log('User does not exist, will create new account');
      }

      // If login fails, try to signup (create new user)
      const signupResponse = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: googleEmail,
          password: firebaseUid
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Failed to create account with Google');
      }

      // Store token and user data
      localStorage.setItem('auth_token', signupData.token);
      localStorage.setItem('user', JSON.stringify(signupData.user));
      
      // Also store Google-specific info
      localStorage.setItem('google_user', JSON.stringify({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      }));
      console.log('Google user signed up successfully');
      router.push('/home');
      
    } catch (error: any) {
      console.error('Google authentication error:', error);
      setError(error.message || 'Failed to authenticate with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Don't render until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-md flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008622]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white flex items-center justify-center px-4 py-8 ${instrumentSans.className}`}>
      <div className="w-full max-w-sm">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          {/* Green icon above Hatch */}
          <div className="mb-4">
            <Image
              src="/logo.svg"
              alt="Hatch icon"
              width={200}
              height={200}
              className="text-green-600"
            />
          </div>
          
          <h1 className={`${bricolage.className} text-[70px] font-medium text-green-600 mb-6`}>Hatch</h1>

        </div>

        {/* Toggle Switch */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setIsSignup(false)}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              !isSignup
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignup(true)}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              isSignup
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Auth Form */}
        <div className="space-y-4">
          {/* Google Auth Button */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-gray-800 text-white py-3 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? 'Please wait...' : `${isSignup ? 'Sign up' : 'Login'} with Google`}
          </button>

          {/* Or divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">Or</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:opacity-50"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:opacity-50"
                placeholder={isSignup ? "Create a password (min 6 characters)" : "Enter your password"}
                required
              />
            </div>

            {/* Confirm Password Input (only for signup) */}
            {isSignup && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-3 border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm disabled:opacity-50"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium mt-6 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Please wait...
                </div>
              ) : (
                `${isSignup ? 'Create Account' : 'Login'} with email`
              )}
            </button>
          </form>

          {/* Alternative Action Link */}
          <div className="text-center text-sm text-gray-600 mt-6">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{" "}
            <button
              onClick={toggleMode}
              disabled={isLoading}
              className="text-green-600 hover:underline font-medium disabled:opacity-50 transition-colors"
            >
              {isSignup ? 'Sign in here' : 'Sign up here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export as dynamic component to prevent SSR
export default dynamic(() => Promise.resolve(AuthPage), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#008622]"></div>
      </div>
    </div>
  )
});