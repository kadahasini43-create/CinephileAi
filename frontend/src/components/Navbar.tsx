import React, { useState } from 'react';
import { Film, User, LogOut, Menu, X, ShieldAlert, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  currentPage,
  onOpenLogin,
}) => {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/60 border-b border-white/5 py-4 px-6 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Brand */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="bg-primary-600 p-2 rounded-lg group-hover:bg-primary-500 transition-colors shadow-md">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-primary-200 to-neon-blue group-hover:text-primary-300 transition-all duration-300">
            Cinephile<span className="text-primary-500 font-extrabold">Ai</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={() => handleNavClick('home')}
            className={`text-sm font-semibold transition-colors duration-200 ${
              currentPage === 'home' ? 'text-neon-blue' : 'text-gray-300 hover:text-white'
            }`}
          >
            Discover
          </button>
          
          {user && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`text-sm font-semibold transition-colors duration-200 ${
                currentPage === 'dashboard' ? 'text-neon-blue' : 'text-gray-300 hover:text-white'
              }`}
            >
              My Space
            </button>
          )}

          {user && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`text-sm font-semibold flex items-center gap-1 transition-colors duration-200 ${
                currentPage === 'admin' ? 'text-neon-blue' : 'text-gray-300 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-neon-pink" />
              Admin
            </button>
          )}
        </div>

        {/* User profile / Login */}
        <div className="hidden md:flex items-center gap-4 relative">
          {user ? (
            <div>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full border border-white/10 hover:border-primary-500/50 hover:shadow-md transition-all duration-200"
              >
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div 
                  className="absolute right-0 mt-3 w-56 glass-panel rounded-xl border border-white/10 p-2 shadow-glass animate-fade-in z-50"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleNavClick('dashboard');
                        setProfileDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" />
                      Dashboard & Preferences
                    </button>
                    
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                        handleNavClick('home');
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-all duration-300 shadow-md flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="md:hidden flex items-center gap-3">
          {user && (
            <img
              src={user.photoURL}
              alt={user.displayName}
              onClick={() => handleNavClick('dashboard')}
              className="w-7 h-7 rounded-full object-cover cursor-pointer border border-white/10"
            />
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel fixed left-0 right-0 top-[65px] border-b border-white/10 p-4 space-y-3 animate-slide-in">
          <button
            onClick={() => handleNavClick('home')}
            className={`block w-full text-left p-2 rounded-lg text-sm font-semibold ${
              currentPage === 'home' ? 'bg-primary-950/40 text-neon-blue border-l-2 border-neon-blue' : 'text-gray-300'
            }`}
          >
            Discover
          </button>
          
          {user && (
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`block w-full text-left p-2 rounded-lg text-sm font-semibold ${
                currentPage === 'dashboard' ? 'bg-primary-950/40 text-neon-blue border-l-2 border-neon-blue' : 'text-gray-300'
              }`}
            >
              My Space
            </button>
          )}

          {user && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`block w-full text-left p-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                currentPage === 'admin' ? 'bg-primary-950/40 text-neon-pink border-l-2 border-neon-pink' : 'text-gray-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-neon-pink" />
              Admin Panel
            </button>
          )}

          {!user ? (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-1.5"
            >
              <User className="w-4 h-4" />
              Sign In
            </button>
          ) : (
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
                handleNavClick('home');
              }}
              className="w-full py-2 bg-neon-pink/10 border border-neon-pink/30 text-neon-pink rounded-lg text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
