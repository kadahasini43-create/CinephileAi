const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get headers with Auth token
const getHeaders = () => {
  const token = localStorage.getItem('cinephile_token') || '';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export interface Movie {
  id: string;
  title: string;
  overview: string;
  genres: string[];
  cast: string[];
  director: string;
  keywords: string[];
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path: string;
  backdrop_path: string;
  tmdb_id: number;
}

export interface Recommendation {
  movie: Movie;
  score: number;
}

export interface UserAnalytics {
  genre_preferences: { genre: string; count: number }[];
  total_favorites: number;
  total_watchlist: number;
  total_ratings: number;
}

export interface HistoryItem {
  history_id: string;
  user_id: string;
  movie_id: string;
  action: string;
  timestamp: string;
  movie: Movie;
}

export interface AdminStats {
  movie_count: number;
  user_count: number;
  favorites_count: number;
  history_count: number;
  ratings_count: number;
  popular_movies: { title: string; count: number }[];
  db_type: string;
}

export const movieApi = {
  // Get all movies or filter
  getMovies: async (params: {
    query?: string;
    genre?: string;
    year?: string;
    rating?: number;
    sort_by?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Movie[]> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        queryParams.append(key, String(val));
      }
    });

    const res = await fetch(`${BASE_URL}/movies?${queryParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch movies');
    return res.json();
  },

  // Autocomplete search suggestions
  getAutocomplete: async (query: string): Promise<any[]> => {
    if (!query || query.length < 2) return [];
    const res = await fetch(`${BASE_URL}/movies/autocomplete?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch search suggestions');
    return res.json();
  },

  // Get genres list
  getGenres: async (): Promise<string[]> => {
    const res = await fetch(`${BASE_URL}/movies/genres`);
    if (!res.ok) throw new Error('Failed to fetch genres');
    return res.json();
  },

  // Get movie details
  getMovieDetails: async (movieId: string): Promise<Movie> => {
    const res = await fetch(`${BASE_URL}/movies/${movieId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch movie details');
    return res.json();
  },

  // Get content-based similar recommendations
  getSimilarMovies: async (movieId: string, limit: number = 10): Promise<Recommendation[]> => {
    const res = await fetch(`${BASE_URL}/movies/${movieId}/recommendations?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch similar movies');
    return res.json();
  },

  // --- USER INTERACTION API ---

  getFavorites: async (): Promise<Movie[]> => {
    const res = await fetch(`${BASE_URL}/user/favorites`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch favorites');
    return res.json();
  },

  addFavorite: async (movieId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/user/favorites`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ movie_id: movieId }),
    });
    if (!res.ok) throw new Error('Failed to add favorite');
    return res.json();
  },

  removeFavorite: async (movieId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/user/favorites?movie_id=${movieId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove favorite');
    return res.json();
  },

  getWatchlist: async (): Promise<Movie[]> => {
    const res = await fetch(`${BASE_URL}/user/watchlist`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch watchlist');
    return res.json();
  },

  addWatchlist: async (movieId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/user/watchlist`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ movie_id: movieId }),
    });
    if (!res.ok) throw new Error('Failed to add to watchlist');
    return res.json();
  },

  removeWatchlist: async (movieId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/user/watchlist?movie_id=${movieId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to remove from watchlist');
    return res.json();
  },

  getRatings: async (): Promise<Record<string, number>> => {
    const res = await fetch(`${BASE_URL}/user/ratings`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch ratings');
    return res.json();
  },

  rateMovie: async (movieId: string, rating: number): Promise<any> => {
    const res = await fetch(`${BASE_URL}/user/ratings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ movie_id: movieId, rating }),
    });
    if (!res.ok) throw new Error('Failed to submit rating');
    return res.json();
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    const res = await fetch(`${BASE_URL}/user/history`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
  },

  getPersonalizedRecommendations: async (limit: number = 10): Promise<Recommendation[]> => {
    const res = await fetch(`${BASE_URL}/user/recommendations?limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch personalized recommendations');
    return res.json();
  },

  getAnalytics: async (): Promise<UserAnalytics> => {
    const res = await fetch(`${BASE_URL}/user/analytics`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // --- ADMIN API ---

  getAdminStats: async (): Promise<AdminStats> => {
    const res = await fetch(`${BASE_URL}/admin/stats`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return res.json();
  },

  rebuildRecommendationModel: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/admin/rebuild-model`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to rebuild model');
    return res.json();
  },

  addOrUpdateMovie: async (movieData: Partial<Movie>): Promise<any> => {
    const res = await fetch(`${BASE_URL}/admin/movies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(movieData),
    });
    if (!res.ok) throw new Error('Failed to save movie');
    return res.json();
  },

  deleteMovie: async (movieId: string): Promise<any> => {
    const res = await fetch(`${BASE_URL}/admin/movies/${movieId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete movie');
    return res.json();
  },

  crawlTMDb: async (): Promise<any> => {
    const res = await fetch(`${BASE_URL}/admin/crawl-tmdb`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to crawl TMDb');
    }
    return res.json();
  },

  uploadMovieImage: async (movieId: string, file: File, type: 'poster' | 'backdrop' = 'poster'): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = localStorage.getItem('cinephile_token') || '';
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}/movies/${movieId}/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload image');
    return res.json();
  },
};
