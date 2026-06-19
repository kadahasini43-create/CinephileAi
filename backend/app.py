import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

from database import Database
from dataset import seed_database
from recommendation import RecommendationEngine
from tmdb import TmdbClient

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Startup Seeding and Model Building
with app.app_context():
    seed_database()
    RecommendationEngine.rebuild_model()

# --- Authentication Middleware Helper ---
def get_auth_user():
    """
    Extracts user info from request's Authorization header.
    Supports Firebase token verification and a robust fallback simulation.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
        
    token = auth_header.split(" ")[1]
    
    # Simulation/Development Mode:
    if token.startswith("mock-"):
        # Format: mock-uid|email|displayName|photoURL
        parts = token.split("|")
        uid = parts[0].replace("mock-", "")
        email = parts[1] if len(parts) > 1 else f"{uid}@example.com"
        name = parts[2] if len(parts) > 2 else uid.capitalize()
        photo = parts[3] if len(parts) > 3 else f"https://api.dicebear.com/7.x/adventurer/svg?seed={uid}"
        return {
            "uid": uid,
            "email": email,
            "name": name,
            "photoURL": photo
        }
        
    # Firebase Verification (if credentials and firebase_admin are available)
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
        
        # Check if Firebase has been initialized
        if not firebase_admin._apps:
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # If credentials are not set up, treat the token as the user ID for development
                return {
                    "uid": token[:28], # Limit UID size
                    "email": "user@firebase.mock",
                    "name": "Firebase User",
                    "photoURL": f"https://api.dicebear.com/7.x/adventurer/svg?seed={token[:5]}"
                }
                
        decoded_token = auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name", "Firebase User"),
            "photoURL": decoded_token.get("picture", "")
        }
    except Exception as e:
        logger.debug(f"Firebase token verification failed, using token string as UID: {e}")
        # Graceful fallback: Treat token as User ID
        return {
            "uid": token[:28],
            "email": "user@firebase.mock",
            "name": "Authenticated User",
            "photoURL": f"https://api.dicebear.com/7.x/adventurer/svg?seed={token[:5]}"
        }


# --- REST API Endpoints ---

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "database": Database.get_db_type(),
        "tmdb_api": "connected" if TmdbClient.is_configured() else "offline_fallback"
    })

# 1. MOVIE SERVICES

@app.route("/api/movies", methods=["GET"])
def list_movies():
    query = request.args.get("query", "")
    genre = request.args.get("genre", "")
    year = request.args.get("year", "")
    rating = request.args.get("rating", 0.0, type=float)
    sort_by = request.args.get("sort_by", "popularity")
    limit = request.args.get("limit", 20, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    movies = Database.search_movies(
        query=query, genre=genre, year=year, rating=rating,
        sort_by=sort_by, limit=limit, offset=offset
    )
    return jsonify(movies)

@app.route("/api/movies/autocomplete", methods=["GET"])
def autocomplete_movies():
    query = request.args.get("query", "")
    if not query or len(query) < 2:
        return jsonify([])
        
    movies = Database.search_movies(query=query, limit=5)
    suggestions = [{
        "id": m["id"],
        "title": m["title"],
        "release_date": m["release_date"],
        "poster_path": m["poster_path"],
        "vote_average": m["vote_average"]
    } for m in movies]
    return jsonify(suggestions)

@app.route("/api/movies/genres", methods=["GET"])
def get_genres():
    # Simple list of standard popular genres in our local dataset
    genres = [
        "Action", "Adventure", "Animation", "Comedy", "Crime", 
        "Drama", "Family", "Fantasy", "Music", "Mystery", 
        "Romance", "Science Fiction", "Thriller", "Western"
    ]
    return jsonify(genres)

@app.route("/api/movies/<movie_id>", methods=["GET"])
def get_movie_detail(movie_id):
    movie = Database.get_movie(movie_id)
    if not movie:
        return jsonify({"error": "Movie not found"}), 404
        
    # Log view action to user history if user is logged in
    user = get_auth_user()
    if user:
        Database.add_history(user["uid"], movie_id, "view")
        
    return jsonify(movie)

@app.route("/api/movies/<movie_id>/recommendations", methods=["GET"])
def get_movie_similar(movie_id):
    limit = request.args.get("limit", 10, type=int)
    recommendations = RecommendationEngine.get_similar_movies(movie_id, top_n=limit)
    return jsonify(recommendations)


# 2. USER INTERACTION SERVICES

@app.route("/api/user/favorites", methods=["GET", "POST", "DELETE"])
def user_favorites():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    uid = user["uid"]
    
    if request.method == "GET":
        favs = Database.get_favorites(uid)
        return jsonify(favs)
        
    elif request.method == "POST":
        data = request.json or {}
        movie_id = data.get("movie_id")
        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400
        Database.add_favorite(uid, movie_id)
        Database.add_history(uid, movie_id, "favorite")
        return jsonify({"success": True})
        
    elif request.method == "DELETE":
        movie_id = request.args.get("movie_id")
        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400
        Database.remove_favorite(uid, movie_id)
        return jsonify({"success": True})

@app.route("/api/user/watchlist", methods=["GET", "POST", "DELETE"])
def user_watchlist():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    uid = user["uid"]
    
    if request.method == "GET":
        wl = Database.get_watchlist(uid)
        return jsonify(wl)
        
    elif request.method == "POST":
        data = request.json or {}
        movie_id = data.get("movie_id")
        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400
        Database.add_watchlist(uid, movie_id)
        Database.add_history(uid, movie_id, "watchlist")
        return jsonify({"success": True})
        
    elif request.method == "DELETE":
        movie_id = request.args.get("movie_id")
        if not movie_id:
            return jsonify({"error": "Missing movie_id"}), 400
        Database.remove_watchlist(uid, movie_id)
        return jsonify({"success": True})

@app.route("/api/user/ratings", methods=["GET", "POST"])
def user_ratings():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    uid = user["uid"]
    
    if request.method == "GET":
        ratings = Database.get_ratings(uid)
        return jsonify(ratings)
        
    elif request.method == "POST":
        data = request.json or {}
        movie_id = data.get("movie_id")
        rating = data.get("rating")
        if not movie_id or rating is None:
            return jsonify({"error": "Missing movie_id or rating"}), 400
        Database.add_rating(uid, movie_id, rating)
        Database.add_history(uid, movie_id, f"rate_{rating}")
        return jsonify({"success": True})

@app.route("/api/user/history", methods=["GET"])
def user_history():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    hist = Database.get_history(user["uid"])
    return jsonify(hist)

@app.route("/api/user/recommendations", methods=["GET"])
def user_recommendations():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    limit = request.args.get("limit", 10, type=int)
    recs = RecommendationEngine.get_personalized_recommendations(user["uid"], top_n=limit)
    return jsonify(recs)

@app.route("/api/user/analytics", methods=["GET"])
def user_analytics():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    uid = user["uid"]
    favs = Database.get_favorites(uid)
    wl = Database.get_watchlist(uid)
    ratings = Database.get_ratings(uid)
    
    # Combined movies list to count genres preference
    interacted_movies = favs + wl
    
    # Include highly rated movies
    for m_id, r in ratings.items():
        if r >= 3.5:
            movie = Database.get_movie(m_id)
            if movie and movie not in interacted_movies:
                interacted_movies.append(movie)
                
    genre_counts = {}
    for m in interacted_movies:
        for g in m.get("genres", []):
            genre_counts[g] = genre_counts.get(g, 0) + 1
            
    # Format for chart display
    analytics = [{"genre": g, "count": count} for g, count in genre_counts.items()]
    # Sort descending
    analytics.sort(key=lambda x: x["count"], reverse=True)
    
    return jsonify({
        "genre_preferences": analytics,
        "total_favorites": len(favs),
        "total_watchlist": len(wl),
        "total_ratings": len(ratings)
    })


# 3. ADMIN PANEL SERVICES

@app.route("/api/admin/stats", methods=["GET"])
def admin_stats():
    user = get_auth_user()
    # In full app, we would verify admin status (e.g. email == admin_email or custom claim).
    # For hackathon/portfolio presentation, we allow all validated logins to view admin features.
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    stats = Database.get_admin_stats()
    return jsonify(stats)

@app.route("/api/admin/rebuild-model", methods=["POST"])
def admin_rebuild_model():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    success = RecommendationEngine.rebuild_model()
    return jsonify({"success": success})

@app.route("/api/admin/movies", methods=["POST", "PUT"])
def admin_add_movie():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    movie_id = Database.insert_movie(data)
    RecommendationEngine.rebuild_model()
    return jsonify({"success": True, "movie_id": movie_id})

@app.route("/api/admin/movies/<movie_id>", methods=["DELETE"])
def admin_delete_movie(movie_id):
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    success = Database.delete_movie(movie_id)
    if success:
        RecommendationEngine.rebuild_model()
    return jsonify({"success": success})

@app.route("/api/movies/<movie_id>/upload-image", methods=["POST"])
def upload_movie_image(movie_id):
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    if "file" not in request.files:
        return jsonify({"error": "No file in request"}), 400
        
    file = request.files["file"]
    img_type = request.form.get("type", "poster") # "poster" or "backdrop"
    
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
        
    movie = Database.get_movie(movie_id)
    if not movie:
        return jsonify({"error": "Movie not found"}), 404
        
    _, ext = os.path.splitext(file.filename)
    if not ext:
        ext = ".jpg"
        
    filename = f"{movie_id}_{img_type}{ext.lower()}"
    
    # Destination directory in frontend's public folder
    dest_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "posters"))
    os.makedirs(dest_dir, exist_ok=True)
    
    dest_path = os.path.join(dest_dir, filename)
    file.save(dest_path)
    
    public_path = f"/posters/{filename}"
    if img_type == "poster":
        movie["poster_path"] = public_path
    else:
        movie["backdrop_path"] = public_path
        
    Database.insert_movie(movie)
    RecommendationEngine.rebuild_model()
    
    return jsonify({
        "success": True,
        "path": public_path,
        "movie": movie
    })


@app.route("/api/admin/crawl-tmdb", methods=["POST"])
def admin_crawl_tmdb():
    user = get_auth_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    if not TmdbClient.is_configured():
        return jsonify({"error": "TMDb API key is not configured in backend .env file."}), 400
        
    trending = TmdbClient.get_trending_movies()
    imported_count = 0
    
    for item in trending:
        tmdb_id = item.get("id")
        if not tmdb_id:
            continue
            
        # Check if already in DB
        exists = Database.get_movie(str(tmdb_id))
        if not exists:
            movie_data = TmdbClient.import_movie_by_tmdb_id(tmdb_id)
            if movie_data:
                Database.insert_movie(movie_data)
                imported_count += 1
                
    if imported_count > 0:
        RecommendationEngine.rebuild_model()
        
    return jsonify({
        "success": True,
        "imported_count": imported_count,
        "message": f"Successfully crawled trending movies. Imported {imported_count} new entries."
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    logger.info(f"Starting Flask server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)
