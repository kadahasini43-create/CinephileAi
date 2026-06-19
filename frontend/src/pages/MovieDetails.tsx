import React, { useState, useEffect } from 'react';
import { movieApi } from '../services/api';
import type { Movie, Recommendation } from '../services/api';
import { MovieCard } from '../components/MovieCard';
import { MovieDetailsSkeleton, MovieGridSkeleton } from '../components/LoaderSkeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Heart, Plus, Check, Star, Calendar, Clock, Film, ArrowLeft, Upload } from 'lucide-react';

interface MovieDetailsProps {
  movieId: string;
  onBack: () => void;
  onSelectMovie: (id: string) => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({
  movieId,
  onBack,
  onSelectMovie,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Data States
  const [movie, setMovie] = useState<Movie | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recsLoading, setRecsLoading] = useState(true);

  // User States
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [submitRating, setSubmitRating] = useState<number>(5);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      setRecsLoading(true);
      try {
        // Fetch Movie Details
        const mData = await movieApi.getMovieDetails(movieId);
        setMovie(mData);
        setLoading(false);

        // Fetch Similar Recommendations
        const rData = await movieApi.getSimilarMovies(movieId, 6);
        setRecommendations(rData);
        setRecsLoading(false);
        
        // Sync user interactive states
        if (user) {
          const favs = await movieApi.getFavorites();
          const wl = await movieApi.getWatchlist();
          const ratings = await movieApi.getRatings();
          
          setIsFavorite(favs.some((f) => f.id === movieId));
          setIsInWatchlist(wl.some((w) => w.id === movieId));
          if (ratings[movieId] !== undefined) {
            setUserRating(ratings[movieId]);
            setSubmitRating(ratings[movieId]);
          } else {
            setUserRating(null);
            setSubmitRating(5);
          }
        }
      } catch (err) {
        showToast('Error loading movie details', 'error');
        onBack();
      }
    };

    fetchMovieData();
  }, [movieId, user]);

  const handleToggleFavorite = async () => {
    if (!user || !movie) {
      showToast('Please sign in to favorite movies', 'info');
      return;
    }
    try {
      if (isFavorite) {
        await movieApi.removeFavorite(movie.id);
        setIsFavorite(false);
        showToast('Removed from favorites', 'success');
      } else {
        await movieApi.addFavorite(movie.id);
        setIsFavorite(true);
        
        // Dynamic confetti
        import('canvas-confetti').then((confetti) => {
          confetti.default({
            particleCount: 60,
            spread: 50,
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

  const handleToggleWatchlist = async () => {
    if (!user || !movie) {
      showToast('Please sign in to manage watchlist', 'info');
      return;
    }
    try {
      if (isInWatchlist) {
        await movieApi.removeWatchlist(movie.id);
        setIsInWatchlist(false);
        showToast('Removed from Watchlist', 'success');
      } else {
        await movieApi.addWatchlist(movie.id);
        setIsInWatchlist(true);
        showToast('Added to Watchlist!', 'success');
      }
    } catch (err) {
      showToast('Failed to update watchlist status', 'error');
    }
  };

  const handleRateSubmit = async () => {
    if (!user || !movie) {
      showToast('Please sign in to rate movies', 'info');
      return;
    }
    try {
      await movieApi.rateMovie(movie.id, submitRating);
      setUserRating(submitRating);
      showToast(`Successfully rated movie ${submitRating}/5 stars`, 'success');
    } catch (err) {
      showToast('Failed to submit rating', 'error');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'poster' | 'backdrop') => {
    if (!movie) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await movieApi.uploadMovieImage(movie.id, file, type);
      if (response.success) {
        setMovie(response.movie);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} image updated successfully!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(`Failed to upload ${type} image`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading || !movie) {
    return <MovieDetailsSkeleton />;
  }

  const backdropUrl = movie.backdrop_path
    ? (movie.backdrop_path.startsWith('http'))
      ? movie.backdrop_path
      : (movie.backdrop_path.startsWith('/posters/') || movie.backdrop_path.startsWith('/assets/'))
        ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${movie.backdrop_path}`
        : `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920';

  const posterUrl = movie.poster_path
    ? (movie.poster_path.startsWith('http'))
      ? movie.poster_path
      : (movie.poster_path.startsWith('/posters/') || movie.poster_path.startsWith('/assets/'))
        ? `${import.meta.env.BASE_URL.replace(/\/$/, '')}${movie.poster_path}`
        : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  return (
    <div className="min-h-screen pb-20 pt-16">
      
      {/* Cinematic Backdrop Image */}
      <div className="relative h-[45vh] sm:h-[65vh] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(9, 5, 20, 0.4), rgba(9, 5, 20, 0.98)), url('${backdropUrl}')`,
          }}
        />
        
        {/* Floating gradient highlights */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="absolute top-8 left-6 sm:left-10 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:border-primary-500/30 text-gray-300 hover:text-white flex items-center gap-2 transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Cinematic Detail Grid */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 -mt-28 sm:-mt-44 relative z-10">
        
        {/* Left Side: Poster and Actions */}
        <div className="space-y-6">
          <div className="glass-panel aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/10 shadow-glass">
            {posterUrl ? (
              <img
                src={posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-primary-950/40 to-background">
                <span className="text-xl font-bold text-gray-300">{movie.title}</span>
                <span className="text-xs text-gray-500 mt-2">No Poster</span>
              </div>
            )}
          </div>

          {/* Interactive User Actions */}
          {user && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleToggleFavorite}
                className={`py-3 px-4 rounded-xl font-semibold border flex items-center justify-center gap-2 transition-all duration-300 ${
                  isFavorite
                    ? 'bg-neon-pink/20 border-neon-pink text-neon-pink'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-neon-pink' : ''}`} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>

              <button
                onClick={handleToggleWatchlist}
                className={`py-3 px-4 rounded-xl font-semibold border flex items-center justify-center gap-2 transition-all duration-300 ${
                  isInWatchlist
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isInWatchlist ? (
                  <>
                    <Check className="w-4 h-4" />
                    Watchlist
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Watchlist
                  </>
                )}
              </button>
            </div>
          )}

          {/* Custom Artworks Uploader */}
          {user && (
            <div className="glass-panel border border-white/5 bg-black/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Movie Media Artwork
                </h4>
                {isUploading && (
                  <span className="text-[10px] text-primary-400 animate-pulse">Uploading...</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary-500/30 text-gray-300 hover:text-white cursor-pointer transition-all duration-200 text-xs font-medium">
                  <Upload className="w-3.5 h-3.5 text-primary-400" />
                  Upload Poster
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleImageUpload(e, 'poster')}
                  />
                </label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-primary-500/30 text-gray-300 hover:text-white cursor-pointer transition-all duration-200 text-xs font-medium">
                  <Upload className="w-3.5 h-3.5 text-primary-400" />
                  Upload Backdrop
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => handleImageUpload(e, 'backdrop')}
                  />
                </label>
              </div>
              <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                Add local image files to customize this movie's presentation.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Primary Movie Info */}
        <div className="md:col-span-2 space-y-6 pt-6 md:pt-16">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
              {movie.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-neon-blue" />
                <span>{movie.release_date || 'N/A'}</span>
              </div>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
              
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-primary-400" />
                <span>{movie.runtime} mins</span>
              </div>
              <span className="w-1.5 h-1.5 bg-gray-700 rounded-full" />
              
              <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-bold px-2 py-0.5 rounded-lg text-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{movie.vote_average.toFixed(1)} TMDb ({movie.vote_count} votes)</span>
              </div>
            </div>
          </div>

          {/* Genre Tags */}
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <span 
                key={g} 
                className="px-3.5 py-1.5 bg-primary-950/40 border border-primary-500/20 text-primary-300 rounded-lg text-xs font-semibold"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Synopsis */}
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">Synopsis</h3>
            <p className="text-gray-300 font-light leading-relaxed text-sm sm:text-base">
              {movie.overview || 'No description available.'}
            </p>
          </div>

          {/* Crew and Cast Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 border border-white/5 rounded-2xl p-5 sm:p-6">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Director</span>
              <p className="text-gray-200 font-bold text-base">{movie.director || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Principal Cast</span>
              <p className="text-gray-200 font-bold text-base leading-snug">
                {movie.cast.length > 0 ? movie.cast.join(', ') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Rating Interactive Panel */}
          {user && (
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  Your Rating
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {userRating !== null 
                    ? `You rated this movie ${userRating} stars` 
                    : 'Submit your rating to customize the recommendation engine'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSubmitRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-6 h-6 ${
                          star <= (userRating !== null ? userRating : submitRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-500'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleRateSubmit}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-md transition-all duration-300"
                >
                  {userRating !== null ? 'Re-rate' : 'Submit'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Recommendations Slider */}
      <div className="max-w-7xl mx-auto px-6 mt-16 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-neon-blue" />
            Because You Viewed {movie.title}
          </h2>
          <p className="text-sm text-gray-400 mt-1">AI-calculated similarity vectors based on metadata match</p>
        </div>

        {recsLoading ? (
          <MovieGridSkeleton count={6} />
        ) : recommendations.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
          <div className="text-center py-10 bg-white/5 border border-white/5 rounded-xl">
            <p className="text-gray-400 text-sm">No recommendation matches in database yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};
