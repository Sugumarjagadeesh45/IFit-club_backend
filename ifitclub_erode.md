# iFit Club Erode - Backend Documentation

## Production URL
**Backend URL**: `https://ifit-club-backend.onrender.com`

---

## CRITICAL: Strava API Quota Error

### Current Error
```
Error 403: Limit of connected athletes exceeded
This app has exceeded the limit of connected athletes.
```

### Why This Happens
- Strava **free tier limits**:
  - 50 athletes per 15 minutes
  - 200 athletes per day
- App Client ID `199879` has reached maximum connected athletes
- This is a **Strava API restriction**, NOT a code bug

### Solutions

#### Option 1: Create NEW Strava API Application (Recommended)
1. Go to https://www.strava.com/settings/api
2. Click **"Create Application"**
3. Fill in:
   - **Application Name**: IFit Club Erode v2
   - **Category**: Training
   - **Website**: https://ifit-club-backend.onrender.com
   - **Authorization Callback Domain**: `ifit-club-backend.onrender.com`
4. Save and copy the new **Client ID** and **Client Secret**
5. Update Render.com environment variables:
   ```
   STRAVA_CLIENT_ID = [NEW_CLIENT_ID]
   STRAVA_CLIENT_SECRET = [NEW_CLIENT_SECRET]
   ```
6. Redeploy on Render.com

#### Option 2: Request Quota Increase from Strava
1. Email: `developers@strava.com`
2. Subject: "Quota Increase Request for App ID 199879 - IFit Club Erode"
3. Include:
   - App name: IFit Club Erode
   - App ID: 199879
   - Use case: Local fitness community tracking app in Erode, India
   - Expected users: [specify number]
4. Wait 3-5 business days for response

#### Option 3: Wait for Daily Reset
- Strava daily limits reset at **midnight UTC**
- Wait 24 hours and try again

---

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User taps "Connect with Strava" in mobile app                   │
│          │                                                          │
│          ▼                                                          │
│  2. App opens browser:                                              │
│     https://ifit-club-backend.onrender.com/api/auth/strava          │
│          │                                                          │
│          ▼                                                          │
│  3. Backend redirects to Strava:                                    │
│     https://www.strava.com/oauth/authorize?client_id=...            │
│          │                                                          │
│          ▼                                                          │
│  4. User clicks "Authorize" on Strava page                          │
│          │                                                          │
│          ▼                                                          │
│  5. Strava redirects to backend:                                    │
│     .../api/auth/strava/callback?code=AUTHORIZATION_CODE            │
│          │                                                          │
│          ▼                                                          │
│  6. Backend (FAST - 2-3 seconds):                                   │
│     ├── Exchanges code for access_token                             │
│     ├── Saves athlete profile to MongoDB                            │
│     ├── Saves OAuth tokens to MongoDB                               │
│     ├── Generates JWT token                                         │
│     └── Redirects IMMEDIATELY to app                                │
│          │                                                          │
│          ▼                                                          │
│  7. Browser shows "Redirecting to iFit Club..."                     │
│     Deep link: ifitclub://auth-success?athleteId=xxx&token=xxx      │
│          │                                                          │
│          ▼                                                          │
│  8. Mobile app opens and navigates to Dashboard                     │
│          │                                                          │
│          ▼                                                          │
│  9. Background: Backend syncs activities (non-blocking)             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

### Render.com Dashboard Settings

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `MONGODB_URI` | `mongodb+srv://webasebrandings:webasebrandings@cluster0.n26qfkr.mongodb.net/ifitcluberodewebase?retryWrites=true&w=majority` |
| `STRAVA_CLIENT_ID` | `199879` (or new ID after creating new app) |
| `STRAVA_CLIENT_SECRET` | `ad52c56b62e365db752a62cc82ad626235133456` (or new secret) |
| `STRAVA_REDIRECT_URI` | `https://ifit-club-backend.onrender.com/api/auth/strava/callback` |
| `JWT_SECRET` | `your-super-secret-jwt-key-change-this-in-production` |
| `JWT_EXPIRE` | `7d` |

### Strava API Settings
- URL: https://www.strava.com/settings/api
- **Authorization Callback Domain**: `ifit-club-backend.onrender.com`

---

## API Endpoints

### Authentication (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/strava` | Start Strava OAuth |
| `GET` | `/api/auth/strava/callback` | OAuth callback (auto) |
| `GET` | `/api/auth/strava/debug` | Debug OAuth config |
| `GET` | `/api/health` | Health check |

### Athlete Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/athlete/:id/profile` | Get profile |
| `GET` | `/api/athlete/:id/activities` | Get activities |
| `GET` | `/api/athlete/:id/stats` | Get statistics |
| `POST` | `/api/athlete/:id/sync` | Sync from Strava |
| `DELETE` | `/api/athlete/:id/disconnect` | Disconnect |

---

## Deep Link Configuration (Mobile App)

### Deep Link Format
```
Success: ifitclub://auth-success?athleteId={id}&token={jwt}&firstName={name}&lastName={name}&profile={url}
Error:   ifitclub://auth-error?message={error}
```

### Android Configuration

**File: `android/app/src/main/AndroidManifest.xml`**

Add inside `<activity android:name=".MainActivity">`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="ifitclub" />
</intent-filter>
```

### iOS Configuration

**File: `ios/YourAppName/Info.plist`**

Add inside `<dict>`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>ifitclub</string>
        </array>
    </dict>
</array>
```

### React Native Deep Link Handler

```javascript
// App.js
import { useEffect } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const App = () => {
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = event.url || event;
      console.log('Deep link:', url);

      if (url?.startsWith('ifitclub://auth-success')) {
        // Parse URL parameters
        const params = {};
        url.split('?')[1]?.split('&').forEach(param => {
          const [key, value] = param.split('=');
          params[key] = decodeURIComponent(value);
        });

        // Save to storage
        await AsyncStorage.setItem('athleteId', params.athleteId);
        await AsyncStorage.setItem('token', params.token);
        await AsyncStorage.setItem('firstName', params.firstName || '');
        await AsyncStorage.setItem('lastName', params.lastName || '');

        // Navigate to Dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }

      if (url?.startsWith('ifitclub://auth-error')) {
        const message = url.split('message=')[1];
        Alert.alert('Error', decodeURIComponent(message));
      }
    };

    // Check if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  return (/* your app */);
};
```

---

## MongoDB Collections

### Athlete
```javascript
{
  stravaId: Number,      // Unique Strava ID
  username: String,
  firstName: String,
  lastName: String,
  profileMedium: String, // Small profile image
  profile: String,       // Large profile image
  city: String,
  state: String,
  country: String,
  gender: String,
  weight: Number,
  premium: Boolean,
  summit: Boolean
}
```

### Activity
```javascript
{
  athleteId: Number,
  stravaActivityId: Number,  // Unique
  name: String,
  type: String,              // 'Run', 'Ride', 'Swim', etc.
  sportType: String,
  distance: Number,          // meters
  movingTime: Number,        // seconds
  elapsedTime: Number,       // seconds
  totalElevationGain: Number,// meters
  startDate: Date,
  startDateLocal: Date,
  averageSpeed: Number,      // m/s
  maxSpeed: Number,          // m/s
  averageHeartrate: Number,
  maxHeartrate: Number,
  calories: Number,
  map: {
    summaryPolyline: String  // Encoded route
  }
}
```

### OAuthToken
```javascript
{
  athleteId: Number,    // Unique
  accessToken: String,
  refreshToken: String,
  expiresAt: Date
}
```

### ActivityStats
```javascript
{
  athleteId: Number,
  recentRunTotals: { count, distance, movingTime, elevationGain },
  ytdRunTotals: { count, distance, movingTime, elevationGain },
  allRunTotals: { count, distance, movingTime, elevationGain },
  recentRideTotals: { ... },
  ytdRideTotals: { ... },
  allRideTotals: { ... }
}
```

---

## API Response Formats

### Profile Response
```json
{
  "success": true,
  "data": {
    "stravaId": 12345678,
    "firstName": "John",
    "lastName": "Doe",
    "profile": "https://...",
    "city": "Erode",
    "state": "Tamil Nadu",
    "country": "India"
  }
}
```

### Activities Response
```json
{
  "success": true,
  "data": [
    {
      "stravaActivityId": 123456,
      "name": "Morning Run",
      "type": "Run",
      "distance": 5000,
      "movingTime": 1800,
      "startDate": "2026-02-03T06:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

---

## Testing Commands

```bash
# Health check
curl https://ifit-club-backend.onrender.com/api/health

# Debug OAuth config (verify redirect URL is correct)
curl https://ifit-club-backend.onrender.com/api/auth/strava/debug

# Get athlete profile
curl https://ifit-club-backend.onrender.com/api/athlete/12345678/profile

# Get activities
curl "https://ifit-club-backend.onrender.com/api/athlete/12345678/activities?page=1&limit=20"

# Test deep link on Android
adb shell am start -W -a android.intent.action.VIEW -d "ifitclub://auth-success?athleteId=123&token=test"
```

---

## Troubleshooting

### Error: "Limit of connected athletes exceeded" (403)
- **Cause**: Strava API quota reached
- **Solution**: Create new Strava app OR wait 24 hours OR request quota increase

### Error: Wrong redirect URL (shows ngrok)
- **Cause**: Old environment variables on Render.com
- **Solution**: Update `STRAVA_REDIRECT_URI` in Render.com dashboard

### Error: "Invalid redirect_uri"
- **Cause**: Strava app callback domain doesn't match
- **Solution**: Update callback domain at https://www.strava.com/settings/api

### Error: Deep link not opening app
- **Cause**: `ifitclub://` scheme not configured
- **Solution**: Add intent-filter to AndroidManifest.xml

### Error: Page shows "Redirecting..." but app doesn't open
- **Cause**: Deep link scheme not registered in mobile app
- **Solution**: Configure deep linking in Android/iOS and rebuild app

---

## Project Structure

```
ifit_club_backend/
├── app.js                  # Express app
├── server.js               # Entry point
├── config/
│   ├── database.js         # MongoDB connection
│   └── strava.js           # Strava config
├── controllers/
│   └── stravaController.js # Route handlers
├── models/
│   ├── Athlete.js
│   ├── Activity.js
│   ├── ActivityStats.js
│   ├── OAuthToken.js
│   └── SyncLog.js
├── routes/
│   └── stravaRoutes.js
├── services/
│   └── stravaService.js    # Strava API calls
├── utils/
│   └── jwtUtils.js
└── .env
```

---

*Last Updated: February 2026*
*Production URL: https://ifit-club-backend.onrender.com*
*Deep Link Scheme: ifitclub://*
