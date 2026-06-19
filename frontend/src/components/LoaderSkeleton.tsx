import React from 'react';

export const MovieCardSkeleton: React.FC = () => {
  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-pulse border border-white/5 shadow-glass">
      {/* Poster Placeholder */}
      <div className="aspect-[2/3] w-full bg-white/5" />
      {/* Text Info Placeholder */}
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-white/5 rounded w-1/4" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
};

export const MovieGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const MovieDetailsSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-8 min-h-screen pt-20">
      {/* Backdrop Area */}
      <div className="h-[40vh] sm:h-[60vh] bg-white/5 w-full relative" />
      
      {/* Details Container */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 -mt-32 relative z-10">
        {/* Left Poster */}
        <div className="glass-panel aspect-[2/3] w-full rounded-2xl bg-white/10 border border-white/5" />
        
        {/* Right Info */}
        <div className="md:col-span-2 space-y-6 pt-16 md:pt-36">
          <div className="h-8 bg-white/10 rounded w-1/2" />
          <div className="flex gap-3">
            <div className="h-6 bg-white/5 rounded-full w-20" />
            <div className="h-6 bg-white/5 rounded-full w-20" />
            <div className="h-6 bg-white/5 rounded-full w-20" />
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
};
