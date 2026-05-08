# HireSphere Frontend (React + Local Auth)

## Setup

1. **Environment variables** (create `frontend/.env`):
   ```
   VITE_API_URL=http://127.0.0.1:8000
   ```

2. **Install and run**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App: http://localhost:5173 (or Vite terminal URL). API requests to `/api/*` are proxied to the Laravel API (run `php artisan serve` in project root).

   For Amplify production, set `VITE_API_URL=https://d149igewvmenpk.cloudfront.net` so browser API calls use the HTTPS CloudFront endpoint.

## Authentication mode

Frontend login/signup pages call backend endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

The bearer token is stored locally and sent in `Authorization` header for protected API calls.
