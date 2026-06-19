import React, { useState, useEffect } from 'react';
import { movieApi } from '../services/api';
import type { Movie, AdminStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldAlert, Database, Plus, Trash2, Cpu, RefreshCw, BarChart2, Check, Globe } from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  
  // Movie Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [overview, setOverview] = useState('');
  const [genres, setGenres] = useState('');
  const [cast, setCast] = useState('');
  const [director, setDirector] = useState('');
  const [keywords, setKeywords] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [runtime, setRuntime] = useState(120);
  const [rating, setRating] = useState(7.0);
  const [posterPath, setPosterPath] = useState('');
  const [backdropPath, setBackdropPath] = useState('');
  const [saving, setSaving] = useState(false);

  // Movie Library List state
  const [moviesList, setMoviesList] = useState<Movie[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await movieApi.getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoviesList = async () => {
    setLibraryLoading(true);
    try {
      const list = await movieApi.getMovies({ limit: 100 });
      setMoviesList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchMoviesList();
    }
  }, [user]);

  const handleCrawlTMDb = async () => {
    setCrawling(true);
    try {
      const result = await movieApi.crawlTMDb();
      showToast(result.message || 'Successfully crawled and imported trending movies!', 'success');
      fetchStats();
      fetchMoviesList();
    } catch (err: any) {
      showToast(err.message || 'TMDb Crawler failed.', 'error');
    } finally {
      setCrawling(false);
    }
  };

  const handleRebuildModel = async () => {
    setRebuilding(true);
    try {
      await movieApi.rebuildRecommendationModel();
      showToast('AI similarity matrix successfully retrained!', 'success');
      
      // confetti
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.8 },
          colors: ['#00f0ff', '#bd00ff', '#ffffff']
        });
      });
    } catch (err) {
      showToast('Model training failed.', 'error');
    } finally {
      setRebuilding(false);
    }
  };

  const handleDeleteMovie = async (id: string, movieTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete ${movieTitle}?`)) return;
    try {
      await movieApi.deleteMovie(id);
      showToast(`Deleted ${movieTitle} successfully`, 'success');
      fetchStats();
      fetchMoviesList();
    } catch (err) {
      showToast('Failed to delete movie', 'error');
    }
  };

  const handleAddMovieSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !director.trim()) {
      showToast('Title and Director are required', 'error');
      return;
    }
    
    setSaving(true);
    const movieData: Partial<Movie> = {
      title: title.trim(),
      overview: overview.trim(),
      genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
      cast: cast.split(',').map((c) => c.trim()).filter(Boolean),
      director: director.trim(),
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      release_date: releaseDate,
      runtime: Number(runtime),
      vote_average: Number(rating),
      vote_count: 1,
      popularity: 5.0,
      poster_path: posterPath.trim() || undefined,
      backdrop_path: backdropPath.trim() || undefined,
    };

    try {
      await movieApi.addOrUpdateMovie(movieData);
      showToast(`Successfully added ${title}!`, 'success');
      
      // Reset form
      setTitle('');
      setOverview('');
      setGenres('');
      setCast('');
      setDirector('');
      setKeywords('');
      setReleaseDate('');
      setRuntime(120);
      setRating(7.0);
      setPosterPath('');
      setBackdropPath('');
      
      setShowAddForm(false);
      fetchStats();
      fetchMoviesList();
    } catch (err) {
      showToast('Failed to save movie', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 text-center space-y-6 pt-28">
        <ShieldAlert className="w-16 h-16 text-neon-pink animate-pulse-slow" />
        <h2 className="text-2xl font-bold text-white">Access Denied</h2>
        <p className="text-gray-400 max-w-md">Please sign in to access administration tools.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 space-y-12">
      
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-neon-pink" />
            CinephileAi Core Command
          </h1>
          <p className="text-sm text-gray-400 mt-1">Configure models, crawl datasets, and review engine health metrics</p>
        </div>

        {/* Action Panel */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRebuildModel}
            disabled={rebuilding}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all duration-300"
          >
            {rebuilding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            {rebuilding ? 'Retraining...' : 'Retrain AI Model'}
          </button>
          
          <button
            onClick={handleCrawlTMDb}
            disabled={crawling}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2 transition-all duration-300"
          >
            {crawling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {crawling ? 'Crawling...' : 'Crawl TMDb'}
          </button>
        </div>
      </div>

      {/* Stats Widgets */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-panel p-5 rounded-xl border border-white/10 relative">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Catalog</span>
              <span className="block text-3xl font-extrabold text-neon-blue mt-1">{stats.movie_count}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">Movies loaded in database</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">System Users</span>
              <span className="block text-3xl font-extrabold text-primary-400 mt-1">{stats.user_count}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">Interacting unique user accounts</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Saved Interactions</span>
              <span className="block text-3xl font-extrabold text-neon-blue mt-1">{stats.favorites_count + stats.ratings_count}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">{stats.favorites_count} Favs | {stats.ratings_count} Ratings</span>
            </div>

            <div className="glass-panel p-5 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Adapter Stack</span>
              <span className="block text-3xl font-extrabold text-neon-blue mt-1 uppercase">{stats.db_type}</span>
              <span className="text-[10px] text-gray-500 mt-2 block">Running database model adapter</span>
            </div>
          </div>
        )
      )}

      {/* Main Core Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Movie Catalog Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-neon-blue" />
              Movie Dataset catalog
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Movie
            </button>
          </div>

          {/* Form to insert custom movie */}
          {showAddForm && (
            <form onSubmit={handleAddMovieSubmit} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 animate-slide-in">
              <h3 className="text-lg font-bold text-white">Create Custom Movie Entry</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Movie Title*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tenet"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Director*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Christopher Nolan"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Plot Overview</label>
                <textarea
                  rows={3}
                  placeholder="Summarize the storyline..."
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Genres (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Action, Thriller"
                    value={genres}
                    onChange={(e) => setGenres(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Cast (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="John David Washington, Robert Pattinson"
                    value={cast}
                    onChange={(e) => setCast(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="time travel, espionage"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Release Date</label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Runtime (mins)</label>
                  <input
                    type="number"
                    value={runtime}
                    onChange={(e) => setRuntime(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">TMDb Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Poster Path (TMDb /p/w500 path or full URL)</label>
                  <input
                    type="text"
                    placeholder="e.g. /gEU2Qv61fd7u0jHki0s4eQQ5VH2.jpg"
                    value={posterPath}
                    onChange={(e) => setPosterPath(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Backdrop Path (TMDb path or full URL)</label>
                  <input
                    type="text"
                    placeholder="e.g. /xJHok76goqpPqtyr08Kldc2QJ44.jpg"
                    value={backdropPath}
                    onChange={(e) => setBackdropPath(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-gray-200 focus:border-neon-blue focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-bold text-white shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Movie'}
                </button>
              </div>
            </form>
          )}

          {/* Library Catalog List */}
          {libraryLoading ? (
            <div className="space-y-4">
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
              <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/5 text-gray-400 border-b border-white/10 font-semibold uppercase tracking-wider text-xs">
                      <th className="p-4">Movie</th>
                      <th className="p-4">Director</th>
                      <th className="p-4">Genres</th>
                      <th className="p-4 text-center">Rating</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {moviesList.map((m) => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-3">
                          {m.poster_path ? (
                            <img
                              src={
                                (m.poster_path.startsWith('http') || m.poster_path.startsWith('/posters/') || m.poster_path.startsWith('/assets/'))
                                  ? m.poster_path
                                  : `https://image.tmdb.org/t/p/w92${m.poster_path}`
                              }
                              alt=""
                              className="w-6 h-9 object-cover rounded"
                            />
                          ) : (
                            <div className="w-6 h-9 bg-white/5 rounded" />
                          )}
                          <span className="truncate max-w-[150px]">{m.title}</span>
                        </td>
                        <td className="p-4 text-gray-400 truncate max-w-[120px]">{m.director}</td>
                        <td className="p-4 text-xs font-semibold text-primary-400">
                          {m.genres.slice(0, 2).join(', ')}
                        </td>
                        <td className="p-4 text-center text-yellow-400 font-bold">
                          {m.vote_average.toFixed(1)}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteMovie(m.id, m.title)}
                            className="p-1.5 text-neon-pink hover:bg-neon-pink/10 rounded-lg transition-colors"
                            title="Delete movie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Recommender Model Analytics and Crawl Diagnostics */}
        <div className="space-y-8">
          
          {/* Model Monitor Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <Cpu className="w-5 h-5 text-neon-blue" />
              Recommendation Diagnostics
            </h2>

            <div className="space-y-4 text-sm font-light text-gray-300">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Similarity Model Status</span>
                <span className="text-neon-blue font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Loaded
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Vector Dimension Space</span>
                <span className="text-white font-bold">{moviesList.length} docs</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-gray-400">Fallback Mode Active</span>
                <span className="text-white font-bold">No (Pure Python TF-IDF)</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase font-semibold">Metadata Features Processed</span>
                <p className="text-xs text-gray-400">Title, Genres, Cast list, Director, Keywords list, Synopsis overview texts.</p>
              </div>
            </div>
          </div>

          {/* Popular favorites list (Top 5) */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-2">
              <BarChart2 className="w-5 h-5 text-primary-400" />
              Top Favorited Movies
            </h2>

            {loading ? (
              <div className="space-y-4">
                <div className="h-6 bg-white/5 rounded animate-pulse" />
                <div className="h-6 bg-white/5 rounded animate-pulse" />
              </div>
            ) : stats && stats.popular_movies.length > 0 ? (
              <div className="space-y-3">
                {stats.popular_movies.map((m, idx) => (
                  <div key={m.title} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs text-neon-blue shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-gray-200 truncate">{m.title}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 shrink-0">{m.count} saves</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500 bg-black/20 rounded-xl">
                No user favorites tracked yet.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
