import React, { useState, useEffect } from 'react';
import { movieApi } from '../services/api';
import type { Movie, Recommendation, UserAnalytics, HistoryItem } from '../services/api';
import { MovieCard } from '../components/MovieCard';
import { MovieGridSkeleton } from '../components/LoaderSkeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Plus, History, Sparkles, BarChart3, Film, ArrowRight } from 'lucide-react';

interface DashboardProps {
  onSelectMovie: (id: string) => void;
  onNavigateHome: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectMovie,
  onNavigateHome,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Data States
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);

  // Refresh Trigger
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [favsData, wlData, histData, analData] = await Promise.all([
          movieApi.getFavorites(),
          movieApi.getWatchlist(),
          movieApi.getHistory(),
          movieApi.getAnalytics(),
        ]);
        
        setFavorites(favsData);
        setWatchlist(wlData);
        setHistory(histData);
        setAnalytics(analData);
        
        setLoading(false);

        // Fetch AI recommendations based on user profile
        setRecsLoading(true);
        const recsData = await movieApi.getPersonalizedRecommendations(6);
        setRecommendations(recsData);
        setRecsLoading(false);
      } catch (err) {
        showToast('Error syncing user space', 'error');
        setLoading(false);
        setRecsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, refreshCount]);

  const handleToggleFavorite = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await movieApi.removeFavorite(movieId);
      setRefreshCount((prev) => prev + 1);
      showToast('Removed from favorites', 'success');
    } catch (err) {
      showToast('Failed to update favorite', 'error');
    }
  };

  const handleToggleWatchlist = async (movieId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await movieApi.removeWatchlist(movieId);
      setRefreshCount((prev) => prev + 1);
      showToast('Removed from Watchlist', 'success');
    } catch (err) {
      showToast('Failed to update watchlist', 'error');
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Film className="w-16 h-16 text-gray-600 animate-pulse-slow" />
        <h2 className="text-2xl font-bold text-white">Your Personal Space</h2>
        <p className="text-gray-400 max-w-md">
          Sign in to save favorites, construct watchlists, track your viewing history, and get personalized AI recommendations.
        </p>
      </div>
    );
  }

  // Render SVG Analytics Chart
  const renderSVGChart = () => {
    if (!analytics || analytics.genre_preferences.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border border-white/5 bg-black/20 rounded-xl p-4 text-center">
          <BarChart3 className="w-8 h-8 text-gray-600 mb-2" />
          <p className="text-xs text-gray-500">Not enough rating data to model genre preferences.</p>
        </div>
      );
    }

    const data = analytics.genre_preferences.slice(0, 5); // top 5
    const maxVal = Math.max(...data.map((d) => d.count));
    const total = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="space-y-4 pt-2">
        {data.map((item, idx) => {
          const percentage = Math.round((item.count / total) * 100);
          const barWidth = `${(item.count / maxVal) * 100}%`;
          
          // Color based on index for variety
          const colors = [
            'bg-neon-blue',
            'bg-primary-500',
            'bg-sky-500',
            'bg-cyan-500',
            'bg-indigo-500'
          ];
          
          return (
            <div key={item.genre} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span>{item.genre}</span>
                <span>{percentage}% ({item.count} items)</span>
              </div>
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${colors[idx % colors.length]}`} 
                  style={{ width: barWidth }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 space-y-12">
      
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Floating gradient highlights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-4 sm:gap-6 relative">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-primary-500 shadow-md"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {user.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-light mt-0.5">{user.email}</p>
            <div className="inline-flex items-center gap-1 bg-neon-blue/10 border border-neon-blue/20 text-neon-blue font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider mt-2.5">
              Active Member
            </div>
          </div>
        </div>

        {/* Mini Stats Widgets */}
        <div className="grid grid-cols-3 gap-6 relative">
          <div className="text-center p-3 px-5 border border-white/5 bg-white/5 rounded-xl">
            <span className="block text-xl font-bold text-white">{favorites.length}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Favorites</span>
          </div>
          <div className="text-center p-3 px-5 border border-white/5 bg-white/5 rounded-xl">
            <span className="block text-xl font-bold text-white">{watchlist.length}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Watchlist</span>
          </div>
          <div className="text-center p-3 px-5 border border-white/5 bg-white/5 rounded-xl">
            <span className="block text-xl font-bold text-white">{history.length}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">History</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Lists and Recommendations */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* AI Recommendations Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-blue animate-pulse-slow" />
                Personalized AI Picks
              </h2>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Trained content matrix</span>
            </div>

            {recsLoading ? (
              <MovieGridSkeleton count={3} />
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {recommendations.map((rec) => (
                  <MovieCard
                    key={rec.movie.id}
                    movie={rec.movie}
                    score={rec.score}
                    onClick={() => onSelectMovie(rec.movie.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="glass-panel text-center py-12 rounded-xl border border-white/5">
                <p className="text-gray-400 text-sm">Rate or favorite movies to start generating AI recommendations.</p>
                <button 
                  onClick={onNavigateHome}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-bold text-white shadow-md flex items-center gap-1.5 mx-auto"
                >
                  Browse Movies
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Favorites List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-neon-pink fill-neon-pink" />
                My Favorites ({favorites.length})
              </h2>
            </div>
            
            {loading ? (
              <MovieGridSkeleton count={3} />
            ) : favorites.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {favorites.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    isFavorite={true}
                    isInWatchlist={watchlist.some((w) => w.id === m.id)}
                    onToggleFavorite={(e) => handleToggleFavorite(m.id, e)}
                    onClick={() => onSelectMovie(m.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-white/5 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm">No favorited movies yet.</p>
              </div>
            )}
          </div>

          {/* Watchlist List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-neon-blue" />
                Watchlist ({watchlist.length})
              </h2>
            </div>

            {loading ? (
              <MovieGridSkeleton count={3} />
            ) : watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {watchlist.map((m) => (
                  <MovieCard
                    key={m.id}
                    movie={m}
                    isFavorite={favorites.some((f) => f.id === m.id)}
                    isInWatchlist={true}
                    onToggleWatchlist={(e) => handleToggleWatchlist(m.id, e)}
                    onClick={() => onSelectMovie(m.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border border-white/5 bg-white/5 rounded-xl">
                <p className="text-gray-400 text-sm">Your watchlist is currently empty.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Preference Analytics & History */}
        <div className="space-y-8">
          
          {/* Analytics Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <BarChart3 className="w-5 h-5 text-neon-blue" />
              Genre Preference Radar
            </h2>
            {loading ? (
              <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
            ) : (
              renderSVGChart()
            )}
          </div>

          {/* History Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <History className="w-5 h-5 text-primary-400" />
              Recommendation History
            </h2>

            {loading ? (
              <div className="space-y-4">
                <div className="h-10 bg-white/5 rounded animate-pulse" />
                <div className="h-10 bg-white/5 rounded animate-pulse" />
                <div className="h-10 bg-white/5 rounded animate-pulse" />
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {history.slice(0, 10).map((h) => (
                  <div 
                    key={h.history_id}
                    onClick={() => onSelectMovie(h.movie.id)}
                    className="p-2.5 rounded-lg border border-white/5 hover:border-primary-500/20 bg-black/10 hover:bg-white/5 transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="truncate">
                      <p className="text-sm font-semibold text-gray-200 group-hover:text-primary-300 transition-colors truncate">
                        {h.movie.title}
                      </p>
                      <span className="text-[10px] text-gray-500">
                        {h.action.replace('rate_', 'Rated ').replace('view', 'Viewed').replace('favorite', 'Favorited')}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-500 border border-white/5 bg-black/20 rounded-xl">
                No history entries yet.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
