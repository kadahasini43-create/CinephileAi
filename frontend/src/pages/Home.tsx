import React, { useState, useEffect } from 'react';
import { Hero } from '../components/Hero';
import { GenreChips } from '../components/GenreChips';
import { MovieCard } from '../components/MovieCard';
import { MovieGridSkeleton } from '../components/LoaderSkeleton';
import { movieApi } from '../services/api';
import type { Movie } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SlidersHorizontal, ArrowUpDown, Calendar, Star, RefreshCw } from 'lucide-react';

interface HomeProps {
  onSelectMovie: (id: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onSelectMovie }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Movie States
  const [movies, setMovies] = useState<Movie[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // User States (Favorites and Watchlist cached keys)
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch static data (genres, trending, movies)
  useEffect(() => {
    const initData = async () => {
      try {
        setGenres(await movieApi.getGenres());
        
        // Fetch trending (sorted by popularity)
        const trendingData = await movieApi.getMovies({ sort_by: 'popularity', limit: 8 });
        setTrending(trendingData);
        setTrendingLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    initData();
  }, []);

  // Fetch movies on filter change
  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const data = await movieApi.getMovies({
          query: searchQuery,
          genre: selectedGenre,
          year: selectedYear,
          rating: minRating || undefined,
          sort_by: sortBy,
        });
        setMovies(data);
      } catch (err) {
        showToast('Error loading movies list', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [searchQuery, selectedGenre, selectedYear, minRating, sortBy]);

  // Sync user favorites and watchlist keys
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setWatchlist([]);
      return;
    }

    const syncUserData = async () => {
      try {
        const favsList = await movieApi.getFavorites();
        const wlList = await movieApi.getWatchlist();
        setFavorites(favsList.map((m) => m.id));
        setWatchlist(wlList.map((m) => m.id));
      } catch (err) {
        console.error('Error syncing user list keys:', err);
      }
    };
    syncUserData();
  }, [user]);

  // Handlers
  const handleToggleFavorite = async (movieId: string) => {
    if (!user) {
      showToast('Please sign in to favorite movies', 'info');
      return;
    }
    const isFav = favorites.includes(movieId);
    try {
      if (isFav) {
        await movieApi.removeFavorite(movieId);
        setFavorites((prev) => prev.filter((id) => id !== movieId));
        showToast('Removed from favorites', 'success');
      } else {
        await movieApi.addFavorite(movieId);
        setFavorites((prev) => [...prev, movieId]);
        
        // Import canvas-confetti dynamically
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#8b5cf6', '#00f0ff', '#ffffff']
          });
        });
        showToast('Added to favorites!', 'success');
      }
    } catch (err) {
      showToast('Failed to update favorite status', 'error');
    }
  };

  const handleToggleWatchlist = async (movieId: string) => {
    if (!user) {
      showToast('Please sign in to manage watchlist', 'info');
      return;
    }
    const isWl = watchlist.includes(movieId);
    try {
      if (isWl) {
        await movieApi.removeWatchlist(movieId);
        setWatchlist((prev) => prev.filter((id) => id !== movieId));
        showToast('Removed from Watchlist', 'success');
      } else {
        await movieApi.addWatchlist(movieId);
        setWatchlist((prev) => [...prev, movieId]);
        showToast('Added to Watchlist!', 'success');
      }
    } catch (err) {
      showToast('Failed to update watchlist status', 'error');
    }
  };

  const handleResetFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setMinRating(0);
    setSortBy('popularity');
    setSearchQuery('');
  };

  const handleExploreClick = () => {
    const el = document.getElementById('explore-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pb-16 pt-16">
      {/* Hero Section */}
      <Hero
        onSearch={(q) => {
          setSearchQuery(q);
          handleExploreClick();
        }}
        onSelectMovie={onSelectMovie}
        onExploreClick={handleExploreClick}
      />

      <div id="explore-section" className="max-w-7xl mx-auto px-6 mt-10 space-y-10">
        
        {/* Trending Section */}
        {trending.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-neon-blue rounded-full" />
              Trending Now
            </h2>
            
            {trendingLoading ? (
              <MovieGridSkeleton count={6} />
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
                {trending.map((m) => (
                  <div key={m.id} className="min-w-[180px] sm:min-w-[220px] max-w-[225px]">
                    <MovieCard
                      movie={m}
                      onClick={() => onSelectMovie(m.id)}
                      isFavorite={favorites.includes(m.id)}
                      isInWatchlist={watchlist.includes(m.id)}
                      onToggleFavorite={() => handleToggleFavorite(m.id)}
                      onToggleWatchlist={() => handleToggleWatchlist(m.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main Explore Section */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="w-1 h-6 bg-primary-500 rounded-full" />
                {searchQuery ? `Search results for "${searchQuery}"` : 'Explore Database'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Browse catalog and filter by parameters</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 border transition-colors ${
                  showFilters || selectedGenre || selectedYear || minRating > 0
                    ? 'bg-primary-950/40 text-neon-blue border-neon-blue/30'
                    : 'bg-white/5 text-gray-300 border-white/5 hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
              
              {(selectedGenre || selectedYear || minRating > 0 || searchQuery) && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-neon-pink/10 border border-neon-pink/30 text-neon-pink hover:bg-neon-pink/20 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Filters Panel */}
          {showFilters && (
            <div className="glass-panel p-6 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-slide-in">
              {/* Genre Selector */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Genre</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                >
                  <option value="">All Genres</option>
                  {genres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-neon-blue" />
                  Release Year
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2014"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 placeholder-gray-500 focus:border-neon-blue focus:outline-none"
                />
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  Minimum Rating ({minRating.toFixed(1)})
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full accent-neon-blue bg-white/5 h-2 rounded-lg cursor-pointer"
                />
              </div>

              {/* Sorting Filter */}
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-primary-400" />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                >
                  <option value="popularity">Popularity</option>
                  <option value="rating">User Rating</option>
                  <option value="release_date">Release Date</option>
                </select>
              </div>
            </div>
          )}

          {/* Quick Genre Chips */}
          <GenreChips
            genres={genres}
            activeGenre={selectedGenre}
            onGenreSelect={setSelectedGenre}
          />

          {/* Movies Grid */}
          {loading ? (
            <MovieGridSkeleton count={12} />
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((m) => (
                <MovieCard
                  key={m.id}
                  movie={m}
                  onClick={() => onSelectMovie(m.id)}
                  isFavorite={favorites.includes(m.id)}
                  isInWatchlist={watchlist.includes(m.id)}
                  onToggleFavorite={() => handleToggleFavorite(m.id)}
                  onToggleWatchlist={() => handleToggleWatchlist(m.id)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel text-center py-20 rounded-2xl border border-white/5 shadow-glass">
              <p className="text-gray-400 text-base">No movies found matching criteria.</p>
              <button 
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-bold text-white shadow-md"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
