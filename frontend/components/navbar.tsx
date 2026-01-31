import React, { useState, useEffect } from 'react';
import { LogOut, User } from 'lucide-react';
import { Bricolage_Grotesque } from 'next/font/google';

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // choose weights you need
});

const Navbar = () => {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUserEmail(user.email || '');
    }
  }, []);

  const handleLogout = () => {
    // Clear localStorage and reset state
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    setUserEmail('');

    
    // Redirect to login page (uncomment when using Next.js router)
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - Logo */}
        <div className="flex items-center">
          <span className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            Hatch
          </span>
        </div>

        {/* Right side - User info and logout */}
        {userEmail && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-gray-700">
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;  