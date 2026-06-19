import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Sparkles } from 'lucide-react';
import { movieApi } from '../services/api';

interface HeroProps {
  onSearch: (query: string) => void;
  onSelectMovie: (id: string) => void;
  onExploreClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onSearch,
  onSelectMovie,
  onExploreClick,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLFormElement>(null);

  // Handle autocomplete fetch
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await movieApi.getAutocomplete(query);
        setSuggestions(data);
      } catch (err) {
        console.error(err);
      }
    };

    const delayDebounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (id: string) => {
    onSelectMovie(id);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full h-[55vh] md:h-[65vh] flex items-center justify-center overflow-hidden">
      {/* Background Graphic */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(2, 6, 23, 0.4) 0%, rgba(2, 6, 23, 0.98) 100%),
            url('/theater_background.png')
          `
        }}
      />
      
      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl w-full space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-950/50 border border-primary-500/30 text-neon-blue font-bold text-xs uppercase tracking-widest animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Movie Recommendations
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Find Your Next <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-neon-blue via-primary-300 to-neon-purple">
            Cinematic Obsession
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-xl mx-auto font-light">
          CinephileAi models your tastes in real-time, matching genres, plots, cast, and directors to generate personalized recommendation matrixes.
        </p>

        {/* Autocomplete Search Bar */}
        <form 
          onSubmit={handleSubmit}
          className="relative max-w-2xl mx-auto w-full"
          ref={dropdownRef}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search movies by title, actor, director, genre..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-12 pr-28 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base text-gray-100 placeholder-gray-400 bg-surface backdrop-blur-md border border-white/10 shadow-md focus:border-primary-500 focus:outline-none transition-all duration-300"
            />
            
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition-all duration-300"
            >
              Analyze
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl border border-white/10 glass-panel shadow-glass p-2 z-50 text-left space-y-1 animate-fade-in">
              {suggestions.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSuggestionClick(m.id)}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  {m.poster_path ? (
                    <img
                      src={
                        (m.poster_path.startsWith('http') || m.poster_path.startsWith('/posters/') || m.poster_path.startsWith('/assets/'))
                          ? m.poster_path
                          : `https://image.tmdb.org/t/p/w92${m.poster_path}`
                      }
                      alt={m.title}
                      className="w-9 h-13 object-cover rounded"
                    />
                  ) : (
                    <div className="w-9 h-13 bg-white/5 rounded flex items-center justify-center text-[8px] text-gray-500 font-bold border border-white/5">
                      No Poster
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-white group-hover:text-primary-300 transition-colors">
                      {m.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{m.release_date ? m.release_date.split('-')[0] : 'N/A'}</span>
                      <span className="w-1 h-1 bg-gray-600 rounded-full" />
                      <span className="flex items-center text-yellow-400">
                        <Star className="w-3 h-3 fill-current mr-0.5" />
                        {m.vote_average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={onExploreClick}
            className="px-6 py-2.5 rounded-lg text-sm font-bold text-white border border-white/15 hover:border-primary-500/50 hover:bg-white/5 transition-all duration-300"
          >
            Explore Library
          </button>
        </div>
      </div>
    </div>
  );
};
