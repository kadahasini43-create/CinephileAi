import logging
import math
import re
from database import Database

logger = logging.getLogger(__name__)

# Try importing scikit-learn; if it fails, we fall back to pure Python TF-IDF + Cosine Similarity.
SKLEARN_AVAILABLE = False
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np
    SKLEARN_AVAILABLE = True
    logger.info("Scikit-learn and NumPy are available. Using optimized recommendation backend.")
except ImportError:
    logger.warning("Scikit-learn or NumPy not found. Initializing pure Python TF-IDF fallback engine.")


class PurePythonRecommender:
    """A pure Python implementation of TF-IDF and Cosine Similarity.
    Ensures zero dependency errors in non-standard Python environments.
    """
    def __init__(self):
        self.vocab = {}
        self.idf = {}
        self.doc_vectors = {} # movie_id -> {term: tfidf}
        self.doc_norms = {}    # movie_id -> float (magnitude)
        self.movie_ids = []
        self.documents = {}   # movie_id -> clean soup text

    def clean_text(self, text):
        if not text:
            return ""
        # Lowercase, alphanumeric characters only
        text = text.lower()
        return re.findall(r'\b[a-z0-9]+\b', text)

    def fit_transform(self, docs):
        """
        docs: dict of movie_id -> raw_soup_text
        """
        self.documents = docs
        self.movie_ids = list(docs.keys())
        
        # 1. Tokenize and count Document Frequencies
        df = {}
        tokenized_docs = {}
        N = len(docs)
        if N == 0:
            return

        for m_id, text in docs.items():
            tokens = self.clean_text(text)
            tokenized_docs[m_id] = tokens
            # Unique terms in this doc
            unique_terms = set(tokens)
            for term in unique_terms:
                df[term] = df.get(term, 0) + 1

        # 2. Compute IDF
        for term, count in df.items():
            # Standard IDF with smoothing
            self.idf[term] = math.log(1.0 + (N / count))

        # 3. Compute TF-IDF vectors
        for m_id, tokens in tokenized_docs.items():
            if not tokens:
                self.doc_vectors[m_id] = {}
                self.doc_norms[m_id] = 1.0
                continue
                
            # Count terms
            tf = {}
            for term in tokens:
                tf[term] = tf.get(term, 0) + 1
                
            # Log term frequency normalization or raw counts
            total_terms = len(tokens)
            vector = {}
            norm_sq = 0.0
            for term, count in tf.items():
                tfidf = (count / total_terms) * self.idf.get(term, 0)
                vector[term] = tfidf
                norm_sq += tfidf * tfidf
                
            self.doc_vectors[m_id] = vector
            self.doc_norms[m_id] = math.sqrt(norm_sq) or 1.0

    def get_similarity(self, id1, id2):
        """Computes cosine similarity between two document vectors."""
        vec1 = self.doc_vectors.get(id1, {})
        vec2 = self.doc_vectors.get(id2, {})
        norm1 = self.doc_norms.get(id1, 1.0)
        norm2 = self.doc_norms.get(id2, 1.0)
        
        if not vec1 or not vec2:
            return 0.0
            
        dot_product = 0.0
        # Iterate over smaller vector for performance
        if len(vec1) > len(vec2):
            vec1, vec2 = vec2, vec1
            
        for term, val1 in vec1.items():
            if term in vec2:
                dot_product += val1 * vec2[term]
                
        return dot_product / (norm1 * norm2)

    def recommend_for_profile(self, user_profile_vec, top_n=10):
        """Computes similarity of all movies against a target user profile vector.
        user_profile_vec: dict of {term: tfidf}
        """
        # Calculate user profile norm
        profile_norm = math.sqrt(sum(v*v for v in user_profile_vec.values())) or 1.0
        
        scores = []
        for m_id in self.movie_ids:
            vec = self.doc_vectors.get(m_id, {})
            norm = self.doc_norms.get(m_id, 1.0)
            if not vec:
                continue
                
            dot_product = 0.0
            for term, val in user_profile_vec.items():
                if term in vec:
                    dot_product += val * vec[term]
                    
            sim = dot_product / (profile_norm * norm)
            scores.append((m_id, sim))
            
        # Sort descending
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_n]


class RecommendationEngine:
    _movies_cache = []
    _soup_cache = {}
    _pure_recommender = None
    
    # Skikit-learn global variables
    _tfidf_matrix = None
    _tfidf_vectorizer = None
    _movie_id_to_index = {}
    _index_to_movie_id = {}

    @classmethod
    def rebuild_model(cls):
        """Fetches all movies from database and fits/trains the similarity model."""
        movies = Database.get_all_movies()
        cls._movies_cache = movies
        
        if not movies:
            logger.warning("No movies found in database. Model building skipped.")
            return False

        # Build content text soup for each movie
        soups = {}
        for m in movies:
            # Metadata soup: genres + cast + director + keywords + overview
            genres_str = " ".join(m.get("genres", []))
            cast_str = " ".join(m.get("cast", []))
            keywords_str = " ".join(m.get("keywords", []))
            director = m.get("director", "")
            overview = m.get("overview", "")
            title = m.get("title", "")
            
            soup = f"{title} {genres_str} {cast_str} {director} {keywords_str} {overview}"
            soups[str(m["id"])] = soup
            
        cls._soup_cache = soups

        if SKLEARN_AVAILABLE:
            try:
                cls._tfidf_vectorizer = TfidfVectorizer(stop_words='english')
                doc_list = [soups[str(m["id"])] for m in movies]
                cls._tfidf_matrix = cls._tfidf_vectorizer.fit_transform(doc_list)
                
                cls._movie_id_to_index = {str(m["id"]): idx for idx, m in enumerate(movies)}
                cls._index_to_movie_id = {idx: str(m["id"]) for idx, m in enumerate(movies)}
                logger.info(f"Model rebuilt successfully using scikit-learn for {len(movies)} movies.")
                return True
            except Exception as e:
                logger.error(f"Failed to build scikit-learn model, falling back to pure Python: {e}")
                
        # Pure Python Fallback implementation
        cls._pure_recommender = PurePythonRecommender()
        cls._pure_recommender.fit_transform(soups)
        logger.info(f"Model rebuilt successfully using pure Python fallback for {len(movies)} movies.")
        return True

    @classmethod
    def get_similar_movies(cls, movie_id, top_n=10):
        """Returns the top N similar movies for a specific movie details page, along with confidence scores."""
        # Ensure model is built
        if not cls._movies_cache or not cls._soup_cache:
            cls.rebuild_model()
            
        movie_id_str = str(movie_id)
        
        # If movie_id not in cache, we cannot recommend (or we recommend popular movies)
        movie_exists = any(str(m["id"]) == movie_id_str for m in cls._movies_cache)
        if not movie_exists:
            # Fallback to popular movies
            sorted_by_pop = sorted(cls._movies_cache, key=lambda x: x.get("popularity", 0.0), reverse=True)
            return [{"movie": m, "score": 0.50} for m in sorted_by_pop[:top_n]]

        if SKLEARN_AVAILABLE and cls._tfidf_matrix is not None:
            try:
                idx = cls._movie_id_to_index[movie_id_str]
                # Compute similarity for this specific movie vector against all others
                target_vector = cls._tfidf_matrix[idx]
                sim_scores = cosine_similarity(target_vector, cls._tfidf_matrix).flatten()
                
                # Pair and sort
                scores_paired = [(cls._index_to_movie_id[i], float(sim_scores[i])) for i in range(len(sim_scores))]
                # Sort descending
                scores_paired.sort(key=lambda x: x[1], reverse=True)
                
                # Exclude self
                recommendations = []
                for m_id, score in scores_paired:
                    if m_id == movie_id_str:
                        continue
                    movie_details = Database.get_movie(m_id)
                    if movie_details:
                        # Normalize score slightly to look like confidence percentage (0.0 to 1.0)
                        recommendations.append({
                            "movie": movie_details,
                            "score": round(max(0.1, min(1.0, score)), 2)
                        })
                        if len(recommendations) >= top_n:
                            break
                return recommendations
            except Exception as e:
                logger.error(f"Error computing scikit-learn similarity, falling back to pure Python: {e}")

        # Pure Python similarity retrieval
        if cls._pure_recommender:
            scores = []
            for m_id in cls._pure_recommender.movie_ids:
                if m_id == movie_id_str:
                    continue
                score = cls._pure_recommender.get_similarity(movie_id_str, m_id)
                scores.append((m_id, score))
                
            scores.sort(key=lambda x: x[1], reverse=True)
            
            recommendations = []
            for m_id, score in scores[:top_n]:
                movie_details = Database.get_movie(m_id)
                if movie_details:
                    recommendations.append({
                        "movie": movie_details,
                        "score": round(max(0.1, min(1.0, score)), 2)
                    })
            return recommendations
            
        return []

    @classmethod
    def get_personalized_recommendations(cls, user_id, top_n=10):
        """Learns user preferences from favorite/watchlist history, builds user profile vector,
        and scores the rest of the movies against it.
        """
        if not cls._movies_cache or not cls._soup_cache:
            cls.rebuild_model()
            
        # Get user's favorites, watchlist and ratings
        fav_movies = Database.get_favorites(user_id)
        watchlist_movies = Database.get_watchlist(user_id)
        
        # Combine items liked/saved by the user
        user_movie_ids = set(str(m["id"]) for m in fav_movies + watchlist_movies)
        
        # Also include movies rated high (> 3.5)
        user_ratings = Database.get_ratings(user_id)
        for m_id, rating in user_ratings.items():
            if rating >= 3.5:
                user_movie_ids.add(str(m_id))

        # If user has no interactive history, recommend popular movies they haven't seen yet
        if not user_movie_ids:
            sorted_by_pop = sorted(cls._movies_cache, key=lambda x: x.get("popularity", 0.0), reverse=True)
            return [{"movie": m, "score": 0.85} for m in sorted_by_pop[:top_n]]

        # Generate User Profile Vector
        user_profile_vec = {}
        
        if SKLEARN_AVAILABLE and cls._tfidf_matrix is not None:
            try:
                # Accumulate tf-idf vectors
                indices = [cls._movie_id_to_index[m_id] for m_id in user_movie_ids if m_id in cls._movie_id_to_index]
                if not indices:
                    # Fallback if somehow user movie ids are not in dataset
                    sorted_by_pop = sorted(cls._movies_cache, key=lambda x: x.get("popularity", 0.0), reverse=True)
                    return [{"movie": m, "score": 0.85} for m in sorted_by_pop[:top_n]]
                    
                # Mean of vectors
                user_vec = cls._tfidf_matrix[indices].mean(axis=0)
                # Compute similarity
                sim_scores = cosine_similarity(user_vec, cls._tfidf_matrix).flatten()
                
                # Pair, sort, and exclude already watched movies
                scores_paired = [(cls._index_to_movie_id[i], float(sim_scores[i])) for i in range(len(sim_scores))]
                scores_paired.sort(key=lambda x: x[1], reverse=True)
                
                recommendations = []
                for m_id, score in scores_paired:
                    if m_id in user_movie_ids:
                        continue # Skip movies already favorited/watchlist/liked
                    movie_details = Database.get_movie(m_id)
                    if movie_details:
                        recommendations.append({
                            "movie": movie_details,
                            "score": round(max(0.1, min(1.0, score)), 2)
                        })
                        if len(recommendations) >= top_n:
                            break
                return recommendations
            except Exception as e:
                logger.error(f"Error computing scikit-learn user recommendation: {e}")

        # Pure Python user profile recommendations
        if cls._pure_recommender:
            # Build average tfidf dictionary for user
            user_vectors = [cls._pure_recommender.doc_vectors[m_id] for m_id in user_movie_ids if m_id in cls._pure_recommender.doc_vectors]
            if not user_vectors:
                sorted_by_pop = sorted(cls._movies_cache, key=lambda x: x.get("popularity", 0.0), reverse=True)
                return [{"movie": m, "score": 0.85} for m in sorted_by_pop[:top_n]]
                
            # Aggregate tf-idf values
            vocab_counts = {}
            for vec in user_vectors:
                for term, val in vec.items():
                    vocab_counts[term] = vocab_counts.get(term, 0.0) + val
                    
            # Compute average
            avg_vector = {term: total / len(user_vectors) for term, total in vocab_counts.items()}
            
            # Recommendation
            scores = cls._pure_recommender.recommend_for_profile(avg_vector, top_n + len(user_movie_ids))
            
            recommendations = []
            for m_id, score in scores:
                if m_id in user_movie_ids:
                    continue # Already watched
                movie_details = Database.get_movie(m_id)
                if movie_details:
                    recommendations.append({
                        "movie": movie_details,
                        "score": round(max(0.1, min(1.0, score)), 2)
                    })
                    if len(recommendations) >= top_n:
                        break
            return recommendations

        return []
