# JetX React Integration Guide

## Overview
This guide explains how to integrate the new React-based JetX game into your Flask application. The new system uses:
- **Backend**: Flask REST API endpoints in `app/routes/jetx_react_api.py`
- **Frontend**: React component in `rebrand/src/components/JetXGameReact/JetXGameReact.jsx`

## What's New

### Backend Changes
1. **New Flask API Blueprint**: `app/routes/jetx_react_api.py`
   - Simple REST endpoints instead of SocketIO
   - Single-player focused
   - Cleaner server-side crash time validation
   - Integrates with existing Wallet and Transaction models

### Frontend Changes
1. **React Component**: `rebrand/src/components/JetXGameReact/JetXGameReact.jsx`
   - Modern React hooks-based component
   - Real-time game loop with smooth animations
   - Error handling and balance tracking
   - Responsive mobile design

## Installation Steps

### Step 1: Register the Flask Blueprint

Edit `app/__init__.py` and add the following in the app creation function:

```python
# After your other blueprints are registered, add:
from app.routes.jetx_react_api import jetx_react_bp
app.register_blueprint(jetx_react_bp)
```

### Step 2: Update Flask CORS (if needed)

Make sure your Flask app has CORS enabled for the React frontend:

```python
# In your main Flask app file
from flask_cors import CORS

# Add this after creating the Flask app:
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://localhost:5173"],
        "supports_credentials": True
    }
})
```

### Step 3: Add React Component to Your Frontend

The component is already in place at:
```
rebrand/src/components/JetXGameReact/JetXGameReact.jsx
rebrand/src/components/JetXGameReact/JetXGameReact.css
```

### Step 4: Use Component in Your App

In your React app (e.g., `rebrand/src/App.jsx` or a games page):

```jsx
import JetXGameReact from './components/JetXGameReact/JetXGameReact';

function GamesPage() {
  return (
    <div>
      <JetXGameReact />
    </div>
  );
}
```

### Step 5: Set API URL (for development)

Create a `.env` file in your React app root:

```
REACT_APP_API_URL=http://localhost:5000
```

For production, set it to your actual backend URL.

## API Endpoints

All endpoints require authentication (login_required).

### Start Game
```
POST /api/jetx/start
Body: { "bet": 100 }
Response: { "game_id": "...", "crash_time": 15000, "bet": 100 }
```

### Cash Out
```
POST /api/jetx/cashout
Body: { "game_id": "...", "multiplier": 2.5 }
Response: { "success": true, "winnings": 250, "profit": 150, "new_balance": 1150 }
```

### Game Crashed
```
POST /api/jetx/crash
Body: { "game_id": "..." }
Response: { "success": true, "new_balance": 900 }
```

### Get Balance
```
GET /api/jetx/balance
Response: { "balance": 1000 }
```

### Get History
```
GET /api/jetx/history?limit=20
Response: [
  { "id": 1, "bet_amount": 100, "cashout_at": 2.5, "payout": 250, "status": "won", "created_at": "..." },
  ...
]
```

### Get Stats
```
GET /api/jetx/stats
Response: {
  "total_wagered": 1000,
  "total_won": 500,
  "total_lost": 500,
  "win_count": 5,
  "loss_count": 5,
  "best_multiplier": 3.2,
  "total_games": 10
}
```

## Game Logic

### Server-Side
1. When game starts, Flask generates a random crash time (5-25 seconds)
2. Bet is immediately deducted from user's wallet
3. Game ID and crash time are sent to React frontend
4. On cashout or crash, backend validates multiplier vs crash point
5. Wallet is updated and stats are recorded

### Client-Side
1. React receives crash time in milliseconds
2. Game loop updates multiplier based on elapsed time
3. Smooth animation of jet flying across screen
4. User can cash out anytime before crash
5. If crash time is reached, automatic crash occurs

## Features

✅ **Provably Fair**: Server seed generation for transparency
✅ **Real-time Multiplier**: Smooth animations during gameplay
✅ **Wallet Integration**: Direct wallet debit/credit
✅ **Stats Tracking**: Win/loss history and statistics
✅ **Responsive Design**: Works on mobile and desktop
✅ **Error Handling**: Graceful error messages
✅ **Authentication**: Uses existing Flask login system

## Troubleshooting

### CORS Errors
Make sure Flask-CORS is installed and configured:
```bash
pip install flask-cors
```

### API Connection Failed
1. Check that Flask server is running on correct port
2. Verify REACT_APP_API_URL environment variable
3. Check browser console for detailed errors

### Balance Not Updating
1. Ensure user is logged in
2. Check that Wallet model is properly initialized
3. Verify database connection

## File Structure

```
your-project/
├── app/
│   └── routes/
│       └── jetx_react_api.py          ← New Flask API
├── rebrand/
│   └── src/
│       └── components/
│           └── JetXGameReact/
│               ├── JetXGameReact.jsx   ← React component
│               └── JetXGameReact.css   ← Styling
```

## Running the Game

### Development

**Terminal 1** (Flask backend):
```bash
python run.py
# Server runs on http://localhost:5000
```

**Terminal 2** (React frontend):
```bash
cd rebrand
npm run dev
# App runs on http://localhost:5173
```

### Production

1. Build React app: `npm run build`
2. Deploy Flask app to Heroku/Vercel/your server
3. Set REACT_APP_API_URL to production backend URL
4. Database migrations (if any new models)

## Database Models Used

The integration uses these existing models:
- `User` (authentication)
- `Wallet` (user balance)
- `Transaction` (game history)
- `JetXGame` (game records)
- `JetXBet` (bet records)
- `JetXStats` (player statistics)

No additional database changes required!

## Next Steps

1. **Deploy**: Push to your GitHub repo
2. **Test**: Play a few rounds to ensure everything works
3. **Monitor**: Check logs for any errors
4. **Optimize**: Adjust CRASH_TIME_MIN/MAX and MIN/MAX bets as needed

## Support

For issues or questions, check:
1. Flask error logs: `flask.log` or console output
2. React console: Browser DevTools → Console tab
3. Network tab: Check API requests and responses

Happy gaming! 🚀
