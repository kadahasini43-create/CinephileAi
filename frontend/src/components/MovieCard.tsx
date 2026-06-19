import React from 'react';
import { Heart, Plus, Check, Star } from 'lucide-react';
import type { Movie } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface MovieCardProps {
  movie: Movie;
  score?: number; // Similarity score (0.0 to 1.0)
  onClick?: () => void;
  isFavorite?: boolean;
  isInWatchlist?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onToggleWatchlist?: (e: React.MouseEvent) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  score,
  onClick,
  isFavorite = false,
  isInWatchlist = false,
  onToggleFavorite,
  onToggleWatchlist,
}) => {
  const { user } = useAuth();
  const imageUrl = movie.poster_path
    ? (movie.poster_path.startsWith('http') || movie.poster_path.startsWith('/posters/') || movie.poster_path.startsWith('/assets/'))
      ? movie.poster_path
      : `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : null;

  const releaseYear = movie.release_date
    ? movie.release_date.split('-')[0]
    : 'N/A';

  // Format confidence score as match percentage
  const matchPercentage = score ? Math.round(score * 100) : null;

  return (
    <div 
      onClick={onClick}
      className="glass-panel rounded-xl overflow-hidden cursor-pointer group relative flex flex-col h-full border border-white/5 shadow-glass transition-all duration-300 hover:scale-[1.03] hover:border-primary-500/30 hover:shadow-md"
    >
      {/* Card Image Area */}
      <div className="aspect-[2/3] w-full bg-white/5 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-primary-950/40 to-background">
            <span className="text-sm font-bold text-gray-300">{movie.title}</span>
            <span className="text-xs text-gray-500 mt-2">No Poster Available</span>
          </div>
        )}
        
        {/* Glow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Match Percentage Glow Card */}
        {matchPercentage !== null && (
          <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-md border border-neon-blue/30 text-neon-blue font-bold px-2 py-0.5 rounded-full text-[10px] tracking-wider uppercase">
            {matchPercentage}% Match
          </div>
        )}

        {/* Rating chip */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border border-white/10 text-yellow-400 font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          {movie.vote_average.toFixed(1)}
        </div>

        {/* Hover Action Panel */}
        {user && (
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            {onToggleFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(e);
                }}
                className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 ${
                  isFavorite
                    ? 'bg-neon-pink/20 border-neon-pink text-neon-pink scale-110'
                    : 'bg-black/60 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}

            {onToggleWatchlist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatchlist(e);
                }}
                className={`p-2 rounded-full backdrop-blur-md border transition-all duration-200 ${
                  isInWatchlist
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue scale-110'
                    : 'bg-black/60 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                title={isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
              >
                {isInWatchlist ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card Info Area */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between bg-black/20">
        <div>
          <h3 className="font-semibold text-sm sm:text-base text-gray-100 group-hover:text-primary-300 transition-colors line-clamp-1">
            {movie.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{releaseYear}</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full" />
            <span className="text-xs text-gray-400 truncate max-w-[100px]">
              {movie.genres[0] || 'Movie'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
