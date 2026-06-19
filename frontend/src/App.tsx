import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { MovieDetails } from './pages/MovieDetails';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { Film, X, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const { loginMock, loginGoogle } = useAuth();
  const { showToast } = useToast();
  
  // Page Routing States
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  
  // Login Overlay State
  const [loginOpen, setLoginOpen] = useState(false);
  const [mockUser, setMockUser] = useState('');
  const [mockEmail, setMockEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const handleSelectMovie = (id: string) => {
    setSelectedMovieId(id);
    setCurrentPage('movie-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDiscover = () => {
    setSelectedMovieId(null);
    setCurrentPage('home');
  };

  const handleSignInMock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockUser.trim()) {
      showToast('Please specify a username', 'error');
      return;
    }
    setSigningIn(true);
    try {
      await loginMock(mockUser, mockEmail || `${mockUser.toLowerCase().replace(/\s/g, '')}@cinephile.ai`);
      showToast(`Welcome back, ${mockUser}!`, 'success');
      setLoginOpen(false);
      setMockUser('');
      setMockEmail('');
    } catch (err) {
      showToast('Login failed', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignInGoogle = async () => {
    setSigningIn(true);
    try {
      await loginGoogle();
      showToast('Successfully signed in!', 'success');
      setLoginOpen(false);
    } catch (err) {
      showToast('Google Sign-in failed. Initializing simulator session.', 'info');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Sticky Global Navigation */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          if (page !== 'movie-detail') {
            setSelectedMovieId(null);
          }
        }}
        onOpenLogin={() => setLoginOpen(true)}
      />

      {/* Pages Switcher */}
      <main className="relative z-10">
        {currentPage === 'home' && (
          <Home onSelectMovie={handleSelectMovie} />
        )}
        
        {currentPage === 'movie-detail' && selectedMovieId && (
          <MovieDetails
            movieId={selectedMovieId}
            onBack={handleBackToDiscover}
            onSelectMovie={handleSelectMovie}
          />
        )}
        
        {currentPage === 'dashboard' && (
          <Dashboard 
            onSelectMovie={handleSelectMovie}
            onNavigateHome={handleBackToDiscover}
          />
        )}
        
        {currentPage === 'admin' && (
          <Admin />
        )}
      </main>

      {/* Glassmorphic Login Modal Overlay */}
      {loginOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel max-w-md w-full rounded-2xl border border-white/10 p-6 relative shadow-glass overflow-hidden">
            
            {/* Top glowing strip */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-blue to-primary-500" />
            
            {/* Close button */}
            <button
              onClick={() => setLoginOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Branding */}
            <div className="flex flex-col items-center text-center space-y-2 mt-2">
              <div className="bg-primary-600 p-2.5 rounded-xl shadow-md mb-1">
                <Film className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Welcome to Cinephile<span className="text-primary-400">Ai</span>
              </h3>
              <p className="text-xs text-gray-400 max-w-xs font-light">
                Unlock collaborative recommendation models, ratings, analytics radar, and watchlists.
              </p>
            </div>

            {/* Google Sign In Trigger */}
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={handleSignInGoogle}
                disabled={signingIn}
                className="w-full py-3 px-4 bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2"
              >
                {/* SVG Google icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.97 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.6 2.8C6.02 7.02 8.78 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.09 2.67-2.31 3.49l3.6 2.8c2.1-1.94 3.77-5.18 3.77-8.44z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.1 14.8c-.25-.76-.4-1.57-.4-2.4s.15-1.64.4-2.4l-3.6-2.8C.54 9.12 0 10.5 0 12s.54 2.88 1.5 4.8l3.6-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.6-2.8c-1.1.74-2.52 1.18-4.36 1.18-3.22 0-5.98-1.98-6.95-5.26l-3.6 2.8C3.4 20.35 7.35 23 12 23z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* OR divider */}
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                <div className="h-px bg-white/10 flex-grow" />
                <span>or use Simulator</span>
                <div className="h-px bg-white/10 flex-grow" />
              </div>

              {/* Simulated username login */}
              <form onSubmit={handleSignInMock} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hasini Fernando"
                    value={mockUser}
                    onChange={(e) => setMockUser(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. hasini@cinephile.ai"
                    value={mockEmail}
                    onChange={(e) => setMockEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all duration-300"
                >
                  {signingIn ? 'Signing in...' : 'Activate Demo Space'}
                </button>
              </form>
            </div>
            
            {/* Warning / Notification about Fallback */}
            <div className="mt-5 p-3 rounded-lg bg-white/5 border border-white/5 flex gap-2">
              <AlertCircle className="w-4 h-4 text-neon-blue shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-400 leading-normal font-light">
                Note: In development mode, mock simulator sessions bypass Google Auth and allow instant testing of all custom recommender dashboards.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
