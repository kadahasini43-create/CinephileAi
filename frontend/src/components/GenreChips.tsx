import React from 'react';

interface GenreChipsProps {
  genres: string[];
  activeGenre: string;
  onGenreSelect: (genre: string) => void;
}

export const GenreChips: React.FC<GenreChipsProps> = ({
  genres,
  activeGenre,
  onGenreSelect,
}) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 sm:mx-0 sm:px-0">
      <button
        onClick={() => onGenreSelect('')}
        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 border ${
          activeGenre === ''
            ? 'bg-primary-600 text-white border-primary-500 shadow-sm'
            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
        }`}
      >
        All Genres
      </button>
      
      {genres.map((g) => (
        <button
          key={g}
          onClick={() => onGenreSelect(g)}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 border ${
            activeGenre === g
              ? 'bg-primary-600 text-white border-primary-500 shadow-sm'
              : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
};
