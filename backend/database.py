import os
import sqlite3
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Check for MongoDB config
MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME = os.getenv("MONGO_DB_NAME", "cinephileai")

# We will check if pymongo is installed and can connect. If not, use SQLite fallback.
db_type = "sqlite"
mongo_client = None
mongo_db = None

if MONGO_URI:
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        # Test connection
        mongo_client.server_info()
        mongo_db = mongo_client[DB_NAME]
        db_type = "mongodb"
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.warning(f"Failed to connect to MongoDB, falling back to SQLite. Error: {e}")
        db_type = "sqlite"
else:
    logger.info("No MONGO_URI provided. Using SQLite database.")

# SQLite configuration
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cinephile.db")

def init_sqlite_db():
    """Initializes SQLite tables if they do not exist."""
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()
    
    # Movies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS movies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        overview TEXT,
        genres TEXT, -- comma-separated
        cast TEXT, -- comma-separated
        director TEXT,
        keywords TEXT, -- comma-separated
        release_date TEXT,
        runtime INTEGER,
        vote_average REAL,
        vote_count INTEGER,
        popularity REAL,
        poster_path TEXT,
        backdrop_path TEXT,
        tmdb_id INTEGER
    )
    """)
    
    # Favorites table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS favorites (
        user_id TEXT,
        movie_id TEXT,
        created_at TEXT,
        PRIMARY KEY (user_id, movie_id)
    )
    """)
    
    # Watchlist table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlist (
        user_id TEXT,
        movie_id TEXT,
        created_at TEXT,
        PRIMARY KEY (user_id, movie_id)
    )
    """)
    
    # Recommendation / View history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        movie_id TEXT,
        action TEXT, -- 'view', 'recommend', 'search'
        timestamp TEXT
    )
    """)
    
    # Ratings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ratings (
        user_id TEXT,
        movie_id TEXT,
        rating REAL,
        timestamp TEXT,
        PRIMARY KEY (user_id, movie_id)
    )
    """)
    
    # Admin settings / info table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_meta (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    conn.commit()
    conn.close()

if db_type == "sqlite":
    init_sqlite_db()

# DB Helpers for SQLite
def get_sqlite_connection():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Core DB Interface
class Database:
    @staticmethod
    def get_db_type():
        return db_type

    # --- MOVIES API ---
    
    @staticmethod
    def get_movie(movie_id):
        if db_type == "mongodb":
            movie = mongo_db.movies.find_one({"id": str(movie_id)})
            if movie:
                movie["_id"] = str(movie["_id"])
            return movie
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM movies WHERE id = ?", (str(movie_id),))
            row = cursor.fetchone()
            conn.close()
            if row:
                movie = dict(row)
                # Convert comma-separated back to list for consistency with Mongo
                movie["genres"] = [g.strip() for g in movie["genres"].split(",")] if movie["genres"] else []
                movie["cast"] = [c.strip() for c in movie["cast"].split(",")] if movie["cast"] else []
                movie["keywords"] = [k.strip() for k in movie["keywords"].split(",")] if movie["keywords"] else []
                return movie
            return None

    @staticmethod
    def get_all_movies():
        if db_type == "mongodb":
            movies = list(mongo_db.movies.find())
            for m in movies:
                m["_id"] = str(m["_id"])
            return movies
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM movies")
            rows = cursor.fetchall()
            conn.close()
            movies = []
            for r in rows:
                movie = dict(r)
                movie["genres"] = [g.strip() for g in movie["genres"].split(",")] if movie["genres"] else []
                movie["cast"] = [c.strip() for c in movie["cast"].split(",")] if movie["cast"] else []
                movie["keywords"] = [k.strip() for k in movie["keywords"].split(",")] if movie["keywords"] else []
                movies.append(movie)
            return movies

    @staticmethod
    def insert_movie(movie):
        # Ensure ID exists
        if "id" not in movie:
            movie["id"] = str(movie.get("tmdb_id", datetime.now().timestamp()))
            
        if db_type == "mongodb":
            # Remove existing first to overwrite
            mongo_db.movies.delete_one({"id": str(movie["id"])})
            mongo_db.movies.insert_one(movie.copy())
            return movie["id"]
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            
            genres_str = ",".join(movie.get("genres", [])) if isinstance(movie.get("genres"), list) else movie.get("genres", "")
            cast_str = ",".join(movie.get("cast", [])) if isinstance(movie.get("cast"), list) else movie.get("cast", "")
            keywords_str = ",".join(movie.get("keywords", [])) if isinstance(movie.get("keywords"), list) else movie.get("keywords", "")
            
            cursor.execute("""
            INSERT OR REPLACE INTO movies (
                id, title, overview, genres, cast, director, keywords, release_date, 
                runtime, vote_average, vote_count, popularity, poster_path, backdrop_path, tmdb_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(movie["id"]),
                movie.get("title", ""),
                movie.get("overview", ""),
                genres_str,
                cast_str,
                movie.get("director", ""),
                keywords_str,
                movie.get("release_date", ""),
                movie.get("runtime", 120),
                movie.get("vote_average", 0.0),
                movie.get("vote_count", 0),
                movie.get("popularity", 0.0),
                movie.get("poster_path", ""),
                movie.get("backdrop_path", ""),
                movie.get("tmdb_id", None)
            ))
            conn.commit()
            conn.close()
            return movie["id"]

    @staticmethod
    def delete_movie(movie_id):
        if db_type == "mongodb":
            result = mongo_db.movies.delete_one({"id": str(movie_id)})
            return result.deleted_count > 0
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM movies WHERE id = ?", (str(movie_id),))
            conn.commit()
            deleted = cursor.rowcount > 0
            conn.close()
            return deleted

    @staticmethod
    def search_movies(query, genre=None, year=None, rating=0.0, sort_by="popularity", limit=20, offset=0):
        if db_type == "mongodb":
            filter_query = {}
            if query:
                # Basic search by title or description regex
                filter_query["$or"] = [
                    {"title": {"$regex": query, "$options": "i"}},
                    {"overview": {"$regex": query, "$options": "i"}}
                ]
            if genre:
                filter_query["genres"] = genre
            if year:
                # Matches year prefix in release_date YYYY-MM-DD
                filter_query["release_date"] = {"$regex": f"^{year}"}
            if rating:
                filter_query["vote_average"] = {"$gte": float(rating)}
                
            sort_dir = -1
            sort_key = "popularity"
            if sort_by == "rating":
                sort_key = "vote_average"
            elif sort_by == "release_date":
                sort_key = "release_date"
                
            cursor = mongo_db.movies.find(filter_query).sort(sort_key, sort_dir).skip(offset).limit(limit)
            movies = list(cursor)
            for m in movies:
                m["_id"] = str(m["_id"])
            return movies
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            
            sql = "SELECT * FROM movies WHERE 1=1"
            params = []
            
            if query:
                sql += " AND (title LIKE ? OR overview LIKE ?)"
                params.extend([f"%{query}%", f"%{query}%"])
            if genre:
                sql += " AND genres LIKE ?"
                params.append(f"%{genre}%")
            if year:
                sql += " AND release_date LIKE ?"
                params.append(f"{year}%")
            if rating:
                sql += " AND vote_average >= ?"
                params.append(float(rating))
                
            if sort_by == "rating":
                sql += " ORDER BY vote_average DESC"
            elif sort_by == "release_date":
                sql += " ORDER BY release_date DESC"
            else:
                sql += " ORDER BY popularity DESC"
                
            sql += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            conn.close()
            
            movies = []
            for r in rows:
                movie = dict(r)
                movie["genres"] = [g.strip() for g in movie["genres"].split(",")] if movie["genres"] else []
                movie["cast"] = [c.strip() for c in movie["cast"].split(",")] if movie["cast"] else []
                movie["keywords"] = [k.strip() for k in movie["keywords"].split(",")] if movie["keywords"] else []
                movies.append(movie)
            return movies

    # --- USER INTERACTION API ---
    
    @staticmethod
    def get_favorites(user_id):
        if db_type == "mongodb":
            favs = list(mongo_db.favorites.find({"user_id": user_id}))
            movie_ids = [f["movie_id"] for f in favs]
            movies = list(mongo_db.movies.find({"id": {"$in": movie_ids}}))
            for m in movies:
                m["_id"] = str(m["_id"])
            return movies
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.* FROM movies m
                JOIN favorites f ON m.id = f.movie_id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            """, (user_id,))
            rows = cursor.fetchall()
            conn.close()
            
            movies = []
            for r in rows:
                movie = dict(r)
                movie["genres"] = [g.strip() for g in movie["genres"].split(",")] if movie["genres"] else []
                movie["cast"] = [c.strip() for c in movie["cast"].split(",")] if movie["cast"] else []
                movie["keywords"] = [k.strip() for k in movie["keywords"].split(",")] if movie["keywords"] else []
                movies.append(movie)
            return movies

    @staticmethod
    def add_favorite(user_id, movie_id):
        created_at = datetime.utcnow().isoformat()
        if db_type == "mongodb":
            mongo_db.favorites.update_one(
                {"user_id": user_id, "movie_id": str(movie_id)},
                {"$set": {"created_at": created_at}},
                upsert=True
            )
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO favorites (user_id, movie_id, created_at) VALUES (?, ?, ?)",
                (user_id, str(movie_id), created_at)
            )
            conn.commit()
            conn.close()
        return True

    @staticmethod
    def remove_favorite(user_id, movie_id):
        if db_type == "mongodb":
            result = mongo_db.favorites.delete_one({"user_id": user_id, "movie_id": str(movie_id)})
            return result.deleted_count > 0
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM favorites WHERE user_id = ? AND movie_id = ?", (user_id, str(movie_id)))
            conn.commit()
            deleted = cursor.rowcount > 0
            conn.close()
            return deleted

    @staticmethod
    def get_watchlist(user_id):
        if db_type == "mongodb":
            wl = list(mongo_db.watchlist.find({"user_id": user_id}))
            movie_ids = [w["movie_id"] for w in wl]
            movies = list(mongo_db.movies.find({"id": {"$in": movie_ids}}))
            for m in movies:
                m["_id"] = str(m["_id"])
            return movies
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT m.* FROM movies m
                JOIN watchlist w ON m.id = w.movie_id
                WHERE w.user_id = ?
                ORDER BY w.created_at DESC
            """, (user_id,))
            rows = cursor.fetchall()
            conn.close()
            
            movies = []
            for r in rows:
                movie = dict(r)
                movie["genres"] = [g.strip() for g in movie["genres"].split(",")] if movie["genres"] else []
                movie["cast"] = [c.strip() for c in movie["cast"].split(",")] if movie["cast"] else []
                movie["keywords"] = [k.strip() for k in movie["keywords"].split(",")] if movie["keywords"] else []
                movies.append(movie)
            return movies

    @staticmethod
    def add_watchlist(user_id, movie_id):
        created_at = datetime.utcnow().isoformat()
        if db_type == "mongodb":
            mongo_db.watchlist.update_one(
                {"user_id": user_id, "movie_id": str(movie_id)},
                {"$set": {"created_at": created_at}},
                upsert=True
            )
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO watchlist (user_id, movie_id, created_at) VALUES (?, ?, ?)",
                (user_id, str(movie_id), created_at)
            )
            conn.commit()
            conn.close()
        return True

    @staticmethod
    def remove_watchlist(user_id, movie_id):
        if db_type == "mongodb":
            result = mongo_db.watchlist.delete_one({"user_id": user_id, "movie_id": str(movie_id)})
            return result.deleted_count > 0
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?", (user_id, str(movie_id)))
            conn.commit()
            deleted = cursor.rowcount > 0
            conn.close()
            return deleted

    @staticmethod
    def get_history(user_id, limit=30):
        if db_type == "mongodb":
            hist = list(mongo_db.history.find({"user_id": user_id}).sort("timestamp", -1).limit(limit))
            # Enrich history items with movie details
            enriched = []
            for h in hist:
                movie = mongo_db.movies.find_one({"id": h["movie_id"]})
                if movie:
                    movie["_id"] = str(movie["_id"])
                    h["movie"] = movie
                    enriched.append(h)
            return enriched
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT h.id as history_id, h.action, h.timestamp, m.* 
                FROM history h
                JOIN movies m ON h.movie_id = m.id
                WHERE h.user_id = ?
                ORDER BY h.timestamp DESC
                LIMIT ?
            """, (user_id, limit))
            rows = cursor.fetchall()
            conn.close()
            
            enriched = []
            for r in rows:
                row_dict = dict(r)
                movie = {
                    "id": row_dict["id"],
                    "title": row_dict["title"],
                    "overview": row_dict["overview"],
                    "genres": [g.strip() for g in row_dict["genres"].split(",")] if row_dict["genres"] else [],
                    "cast": [c.strip() for c in row_dict["cast"].split(",")] if row_dict["cast"] else [],
                    "director": row_dict["director"],
                    "keywords": [k.strip() for k in row_dict["keywords"].split(",")] if row_dict["keywords"] else [],
                    "release_date": row_dict["release_date"],
                    "runtime": row_dict["runtime"],
                    "vote_average": row_dict["vote_average"],
                    "vote_count": row_dict["vote_count"],
                    "popularity": row_dict["popularity"],
                    "poster_path": row_dict["poster_path"],
                    "backdrop_path": row_dict["backdrop_path"],
                    "tmdb_id": row_dict["tmdb_id"]
                }
                enriched.append({
                    "history_id": row_dict["history_id"],
                    "user_id": user_id,
                    "movie_id": row_dict["id"],
                    "action": row_dict["action"],
                    "timestamp": row_dict["timestamp"],
                    "movie": movie
                })
            return enriched

    @staticmethod
    def add_history(user_id, movie_id, action="view"):
        timestamp = datetime.utcnow().isoformat()
        if db_type == "mongodb":
            mongo_db.history.insert_one({
                "user_id": user_id,
                "movie_id": str(movie_id),
                "action": action,
                "timestamp": timestamp
            })
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO history (user_id, movie_id, action, timestamp) VALUES (?, ?, ?, ?)",
                (user_id, str(movie_id), action, timestamp)
            )
            conn.commit()
            conn.close()
        return True

    @staticmethod
    def get_ratings(user_id):
        if db_type == "mongodb":
            ratings_list = list(mongo_db.ratings.find({"user_id": user_id}))
            result = {}
            for r in ratings_list:
                result[r["movie_id"]] = r["rating"]
            return result
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT movie_id, rating FROM ratings WHERE user_id = ?", (user_id,))
            rows = cursor.fetchall()
            conn.close()
            return {r["movie_id"]: r["rating"] for r in rows}

    @staticmethod
    def add_rating(user_id, movie_id, rating):
        timestamp = datetime.utcnow().isoformat()
        if db_type == "mongodb":
            mongo_db.ratings.update_one(
                {"user_id": user_id, "movie_id": str(movie_id)},
                {"$set": {"rating": float(rating), "timestamp": timestamp}},
                upsert=True
            )
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO ratings (user_id, movie_id, rating, timestamp) VALUES (?, ?, ?, ?)",
                (user_id, str(movie_id), float(rating), timestamp)
            )
            conn.commit()
            conn.close()
        return True

    # --- ADMIN API ---
    @staticmethod
    def get_admin_stats():
        if db_type == "mongodb":
            movie_count = mongo_db.movies.count_documents({})
            user_count = len(mongo_db.favorites.distinct("user_id"))
            favs_count = mongo_db.favorites.count_documents({})
            history_count = mongo_db.history.count_documents({})
            ratings_count = mongo_db.ratings.count_documents({})
            
            # Simple aggregations
            pipeline = [
                {"$group": {"_id": "$movie_id", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 5}
            ]
            popular_favs = list(mongo_db.favorites.aggregate(pipeline))
            popular_list = []
            for item in popular_favs:
                movie = mongo_db.movies.find_one({"id": item["_id"]})
                if movie:
                    popular_list.append({"title": movie["title"], "count": item["count"]})
        else:
            conn = get_sqlite_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM movies")
            movie_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT user_id) FROM favorites")
            user_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM favorites")
            favs_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM history")
            history_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM ratings")
            ratings_count = cursor.fetchone()[0]
            
            # Popular movies query
            cursor.execute("""
                SELECT m.title, COUNT(f.movie_id) as count
                FROM favorites f
                JOIN movies m ON f.movie_id = m.id
                GROUP BY f.movie_id
                ORDER BY count DESC
                LIMIT 5
            """)
            popular_list = [{"title": r["title"], "count": r["count"]} for r in cursor.fetchall()]
            conn.close()
            
        return {
            "movie_count": movie_count,
            "user_count": max(user_count, 1), # Ensure at least 1 mock user
            "favorites_count": favs_count,
            "history_count": history_count,
            "ratings_count": ratings_count,
            "popular_movies": popular_list,
            "db_type": db_type
        }
