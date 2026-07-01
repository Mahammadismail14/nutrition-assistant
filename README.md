# Nutrition Assistant
JWT authentication + Meal planning + Calorie tracking API 
Nutrition Assistant is a compact MERN-style wellness dashboard for coaching clients through nutrition planning and progress tracking. The app combines an Express API with a React frontend to support authentication, client management, meal plans, and progress insights.

## Features
- Secure register/login flow with JWT-based authentication
- Client management for care tracking
- Meal plan creation and coaching focus tracking
- Progress logging with calorie summaries
- Dashboard insights for nutrition status, meal-planning focus, and progress trend

## Project structure
- backend: Express server, API routes, and tests
- frontend: React + Vite app for the dashboard experience

## Run locally

### Development mode
```bash
npm run dev
```

This launches both the backend and frontend together for local development.

### Production-style mode
```bash
npm run start:prod
```

This builds the frontend and serves the app from the backend on a single address.

### Manual start
1. Install dependencies
```bash
cd backend
npm install

cd ../frontend
npm install
```

2. Start the backend
```bash
cd backend
npm start
```

3. Start the frontend in a second terminal
```bash
cd frontend
npm run dev
```

The frontend proxies API requests to the backend on port 5000 when available, while the production-style mode serves the built app from the backend.

## Verification
- Backend tests: `cd backend && npm test`
- Frontend build: `cd frontend && npm run build`
