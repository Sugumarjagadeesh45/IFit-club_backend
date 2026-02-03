# iFit Club Erode - Backend Documentation

## Overview
This is a production-ready Node.js + Express backend for the iFit Club Erode mobile application. It handles Strava OAuth 2.0 authentication, data synchronization (activities, stats), and secure storage using MongoDB.

## Key Features
- **Strava OAuth 2.0**: Secure "Connect with Strava" flow.
- **Deep Linking**: Redirects users back to the mobile app (`ifitclub://`) after authentication.
- **Android Compatibility**: Uses HTML/JS redirection to bypass Chrome's blocking of direct 302 redirects to custom schemes.
- **Data Sync**: Fetches and stores athlete profile, statistics, and activities.
- **Security**: Uses Environment variables and JWT tokens.

## Authentication Flow
1. **Mobile App** opens `GET /api/auth/strava`.
2. **Backend** redirects user to Strava Authorization page.
3. **User** authorizes the app on Strava.
4. **Strava** redirects to `GET /api/auth/strava/callback?code=...`.
5. **Backend**:
   - Exchanges `code` for `access_token` and `refresh_token`.
   - Fetches Athlete Profile, Stats, and Activities.
   - Stores/Updates data in MongoDB.
   - Returns an HTML page that automatically redirects to `ifitclub://auth-success`.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/strava` | Initiates Strava OAuth flow. |
| `GET` | `/api/auth/strava/callback` | Handles Strava callback and syncs data. |

### Athlete Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/athlete/:id/profile` | Get stored athlete profile. |
| `GET` | `/api/athlete/:id/stats` | Get athlete statistics. |
| `GET` | `/api/athlete/:id/activities` | Get paginated activities. |
| `POST` | `/api/athlete/:id/sync` | Trigger manual data sync. |

## Environment Variables (.env)
Ensure the following variables are set in your `.env` file:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ifit_club
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=https://your-backend-url/api/auth/strava/callback
JWT_SECRET=your_secure_jwt_secret
```

## Deep Linking Response (Android Fix)
To support Android Chrome, the callback returns an HTML page instead of a 302 redirect:

```html
<!DOCTYPE html>
<html>
<body>
  <p>Redirecting to iFit Club...</p>
  <script>
    setTimeout(() => { 
      window.location.href = "ifitclub://auth-success?token=..."; 
    }, 500);
  </script>
</body>
</html>
```

## Database Schema (MongoDB)

1. **Athletes**: Stores user profile (name, city, weight, etc.).
2. **Activities**: Stores individual run/ride/swim records.
3. **Stats**: Stores aggregated statistics (YTD, All-time).
4. **OAuthTokens**: Stores encrypted access & refresh tokens.
5. **SyncLogs**: Tracks history of data synchronizations.

## Setup
1. `npm install`
2. `npm start`