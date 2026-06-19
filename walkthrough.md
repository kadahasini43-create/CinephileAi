# CinephileAi - Walkthrough

We have built **CinephileAi**, a full-stack, AI-powered movie recommendation system designed with a modern Netflix-inspired aesthetic. The application runs offline out of the box with SQLite and a pure Python recommendation engine fallback.

---

## Technical Stack & Architecture

```mermaid
graph TD
    subgraph Client (Vite + React + TS)
        A[Navbar & Hero Banner] --> B[Discover Search / Autocomplete]
        B --> C[Cinematic Movie Details]
        D[User Dashboard / My Space] --> E[SVG Genre Analytics]
        F[Admin Panel] --> G[Dataset & Model retrain]
    end

    subgraph Service Layer (Flask Backend)
        H[Flask Server] --> I[Pure Python TF-IDF engine]
        H --> J[Dual DB Adapter]
        J --> K[(SQLite / MongoDB Fallback)]
    end
    
    Client -- Fetch API --> ServiceLayer
```

* **Frontend:** React, TypeScript, Tailwind CSS, Lucide icons, Framer Motion, Canvas Confetti.
* **Backend:** Python Flask.
* **Database Adapter:** MongoDB with automatic local SQLite database fallback.
* **Recommender Model:** Dual content-based TF-IDF and Cosine Similarity model (automatically runs standard `scikit-learn` if present, or falls back to a custom, zero-dependency pure Python/math implementation).
* **UI Theme:** Modern SaaS-inspired deep slate-black background (`#020617`), Vercel-like inset glassmorphism borders (`rgba(255, 255, 255, 0.07)` with `24px` blur), and a royal blue accent color scale.

---

## Features Built

### 1. Discover / Home Page
* **Hero Search:** Includes real-time search suggestions with autocomplete dropdown showing titles, years, and ratings.
* **Trending Carousel:** Displays popular catalog entries with quick watchlist/favorite overlays.
* **Pill Filter Chips:** Allows instantly filtering movies by genre.
* **Advanced Filters:** Collapsible panel for refining searches by year range, min rating, and sorting criteria (popularity, rating, release date).

### 2. Movie Recommendation Engine
* **Metadata Soup Vectorizer:** Merges movie title, genres, cast, director, keywords, and synopsis to construct TF-IDF profiles.
* **Similar Movies Carousel:** Displays similar movie recommendations on details pages, listing calculated percentage matches (e.g. `92% Match`).
* **Personalized AI Recommendations:** Builds a profile vector representing a user's collective preferences (from likes, ratings, watchlist), then returns matching movies that the user hasn't seen yet.

### 3. Movie Details Page
* Cinematic backdrop and poster overlays with high-quality TMDb image assets.
* Full listings for Director, Principal Cast, Runtime, Release Year, and Synopsis.
* Interactive rating slider (1-5 stars) and instant favoriting/watchlist triggers.

### 4. Interactive User Dashboard ("My Space")
* Displays user statistics (total favorites, watchlist items, viewing history count).
* **Cybernetic SVG Analytics:** Renders custom, lightweight SVG bar charts summarizing genre preferences.
* Watchlist, Favorites, and chronological History trackers.

### 5. Core Admin Command Panel
* **Engine Health Statistics:** Catalog totals, user metrics, and current database engine adapter in use.
* **Crawler Utility:** Live crawler that crawls trending movie listings from the TMDb API (requires TMDb key in `.env`).
* **AI Model Tuner:** Instantly rebuilds similarity vector spaces and retrains the model.
* **Movie Manager:** Admin portal form to manually insert, edit, and delete movie catalog files.

---

## Instructions to Run Locally

### 1. Launch the Backend API
Navigate to the backend directory, activate the environment, and run Flask:
```powershell
cd backend
.\venv\Scripts\Activate.ps1   # Optional
.\venv\Scripts\python app.py
```
> [!NOTE]
> The server will initialize on `http://localhost:5000` and automatically populate `backend/cinephile.db` with 25 popular seed movies if the database is empty.

### 2. Launch the React Client
Navigate to the frontend directory and start the Vite dev server:
```powershell
cd frontend
npm run dev
```
> [!NOTE]
> = The client will start on `http://localhost:5173/`. Open this link in your browser to experience the application.

### 3. Sign In (Simulation Mode)
Click **Sign In** on the top right. In development mode, you can type any user name (e.g., *Hasini Fernando*) in the simulator text box and click **Activate Demo Space** to instantly access favorites, watchlists, history logging, and custom analytics widgets.

---

## Visual Updates & Theater Image Integration

We generated a custom movie theater interior background image aligned with the application's clean dark-slate and royal-blue theme.

### Generated Asset
![Generated Movie Theater Background](C:\Users\hasini\.gemini\antigravity-ide\brain\1f487ac5-a939-456a-850f-b8c16e03a2ca\theater_background_1781865538434.png)

### Live Application Integration
The image was successfully configured as the Hero background component and verified inside a live browser session:
![CinephileAi Home Page Hero](C:\Users\hasini\.gemini\antigravity-ide\brain\1f487ac5-a939-456a-850f-b8c16e03a2ca\homepage_hero_background_1781865576580.png)

---

## Interactive Local Image Upload

We implemented a custom local file upload feature that allows adding custom posters and backdrops for any movie in the database.

### Features
* **Backend Upload Handler:** A robust Flask route `/api/movies/<movie_id>/upload-image` saves uploaded files locally under `frontend/public/posters/` and updates the MongoDB/SQLite database record.
* **Frontend Media Controller:** Added a clean "Movie Media Artwork" control card in the Movie Details page that allows uploading custom posters and backdrops with instant live preview.

### Verified Uploader Interface
![Movie details showing artwork uploader](C:\Users\hasini\.gemini\antigravity-ide\brain\1f487ac5-a939-456a-850f-b8c16e03a2ca\movie_details_artwork_visible_1781865803106.png)

---

## Official Movie Poster Caching (Offline Mode)

We registered a secure OMDb API Key and built an automated downloader utility (`download_images.ps1` and `update_database_posters.py`) to fetch the actual, high-quality, official posters from public CDNs and cache them locally in the frontend public directory.

### Caching Process
1. **OMDb Key Registration:** Generated and validated OMDb API Key `26354b1d`.
2. **Metadata Resolution:** Scraped official poster links for all 25 catalog movies.
3. **Local Storage:** Saved files directly to `frontend/public/posters/<movie_id>_poster.jpg`.
4. **Database Migration:** Swapped out dummy paths in the DB with absolute paths to local assets so the application runs offline.

### Verification
Here are screenshots of the homepage trending lists loading the cached real posters:
![Trending movies showing Interstellar and Inception](C:\Users\hasini\.gemini\antigravity-ide\brain\1f487ac5-a939-456a-850f-b8c16e03a2ca\trending_movies_now_1781874787070.png)
![Trending movies showing The Dark Knight](C:\Users\hasini\.gemini\antigravity-ide\brain\1f487ac5-a939-456a-850f-b8c16e03a2ca\trending_movies_dark_knight_1781874798556.png)

---

## GitHub Pages Configuration & CI/CD

We configured the frontend codebase to support deployment to GitHub Pages at the repository path `/CinephileAi/`:

### Key Modifications
* **Vite Config:** Updated [vite.config.ts](file:///c:/Users/hasini/cinephileai/frontend/vite.config.ts) to set `base: '/CinephileAi/'` for correct production path routing.
* **Asset Prepending:** Updated components ([Hero.tsx](file:///c:/Users/hasini/cinephileai/frontend/src/components/Hero.tsx), [MovieCard.tsx](file:///c:/Users/hasini/cinephileai/frontend/src/components/MovieCard.tsx), [MovieDetails.tsx](file:///c:/Users/hasini/cinephileai/frontend/src/pages/MovieDetails.tsx), [Admin.tsx](file:///c:/Users/hasini/cinephileai/frontend/src/pages/Admin.tsx)) to prepend local asset paths (like `/posters/` and `/theater_background.png`) with `import.meta.env.BASE_URL` dynamically.
* **Jekyll & 404 Routing Fallback:** Added [copy-404.js](file:///c:/Users/hasini/cinephileai/frontend/copy-404.js) to automate copying `index.html` to `404.html` and creating a `.nojekyll` file in every production build.
* **CI/CD Pipeline:** Created a GitHub Actions workflow [.github/workflows/deploy.yml](file:///c:/Users/hasini/cinephileai/.github/workflows/deploy.yml) that builds the React project on every push to `main` and automatically deploys the built outputs to the `gh-pages` branch. (We fixed a runner-side package resolution failure by upgrading the workflow environment to Node 22 and switching from `npm ci` to `npm install` for improved lockfile portability).
* **Settings Activation:** Since GitHub Pages requires manual activation for new custom builds on public repositories, please ensure that under **Settings > Pages** on GitHub, the **Source** is set to **Deploy from a branch** and the **Branch** is set to **`gh-pages`** (under the root `/` folder).

---

## Source Code Repository

The complete codebase has been initialized and pushed to GitHub:
* **Repository URL:** [kadahasini43-create/CinephileAi](https://github.com/kadahasini43-create/CinephileAi.git)
* **Main Branch:** `main`
* **Exclusions:** Sensitive configurations (e.g. `.env`), SQLite files (`cinephile.db`), and virtual environments (`venv`) are ignored via a custom root `.gitignore`.
