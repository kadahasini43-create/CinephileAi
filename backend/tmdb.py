import os
import requests
import logging

logger = logging.getLogger(__name__)

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
BASE_URL = "https://api.themoviedb.org/3"

class TmdbClient:
    @staticmethod
    def is_configured():
        return len(TMDB_API_KEY) > 0

    @classmethod
    def _get(cls, path, params=None):
        if not cls.is_configured():
            logger.debug("TMDb API key not configured. Skipping request.")
            return None
            
        url = f"{BASE_URL}/{path}"
        default_params = {
            "api_key": TMDB_API_KEY,
            "language": "en-US"
        }
        if params:
            default_params.update(params)
            
        try:
            response = requests.get(url, params=default_params, timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"TMDb API returned status code {response.status_code}: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error fetching from TMDb API: {e}")
            return None

    @classmethod
    def get_trending_movies(cls):
        """Fetches trending movies from TMDb."""
        result = cls._get("trending/movie/week")
        if result and "results" in result:
            return result["results"]
        return []

    @classmethod
    def search_movies(cls, query):
        """Searches movies on TMDb."""
        result = cls._get("search/movie", {"query": query, "include_adult": "false"})
        if result and "results" in result:
            return result["results"]
        return []

    @classmethod
    def get_movie_details(cls, tmdb_id):
        """Fetches detailed info for a specific movie."""
        return cls._get(f"movie/{tmdb_id}")

    @classmethod
    def get_movie_credits(cls, tmdb_id):
        """Fetches cast and crew for a movie to extract director and actors."""
        return cls._get(f"movie/{tmdb_id}/credits")

    @classmethod
    def import_movie_by_tmdb_id(cls, tmdb_id):
        """Fetches all necessary movie data from TMDb and formats it for insert_movie."""
        if not cls.is_configured():
            return None
            
        details = cls.get_movie_details(tmdb_id)
        if not details:
            return None
            
        credits = cls.get_movie_credits(tmdb_id)
        
        # Extract cast and director
        cast_list = []
        director_name = ""
        if credits:
            cast_list = [actor["name"] for actor in credits.get("cast", [])[:5]]
            crew = credits.get("crew", [])
            for member in crew:
                if member.get("job") == "Director":
                    director_name = member.get("name", "")
                    break

        # Extract genres
        genres_list = [g["name"] for g in details.get("genres", [])]
        
        # Build movie dict
        movie_data = {
            "id": str(details.get("id")),
            "title": details.get("title", ""),
            "overview": details.get("overview", ""),
            "genres": genres_list,
            "cast": cast_list,
            "director": director_name,
            "keywords": [], # TMDB doesn't return keywords in details easily without another call, can leave empty or mock
            "release_date": details.get("release_date", ""),
            "runtime": details.get("runtime", 120),
            "vote_average": details.get("vote_average", 0.0),
            "vote_count": details.get("vote_count", 0),
            "popularity": details.get("popularity", 0.0),
            "poster_path": details.get("poster_path", ""),
            "backdrop_path": details.get("backdrop_path", ""),
            "tmdb_id": details.get("id")
        }
        
        return movie_data
