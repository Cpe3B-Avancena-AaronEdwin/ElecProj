# CityBloop / ElecProj README.md

## 🚍 Overview

**CityBloop** is a Smart Public Transportation Analytics Platform focused on **Metro Manila**. It combines GTFS transit data, live traffic intelligence, route analytics, congestion prediction, and trip planning into one modern web dashboard.

The system is designed for:

* Researchers
* Students
* Urban planners
* Transit operators
* Government reviewers
* Commuters

---

# 🌐 Live Stack

## Frontend

* React
* Vite
* Recharts
* Leaflet
* React Router

## Backend

* Node.js
* Express.js

## Database

* Railway MySQL

## Hosting

* Frontend: Vercel
* Backend: Render

## Domain

https://citybloop.com

---

# 🚦 Core Features

---

## 📊 Dashboard

Main analytics page showing:

* Live Traffic Map
* 24-Hour Congestion Trend
* On-Time Rate
* Estimated Passenger Volume
* Last Update Status
* Next-Hour Prediction
* Recommended Actions

---

## 🗺 Live Traffic Intelligence

Uses TomTom traffic APIs and sampled road points across Metro Manila.

Traffic score ranges:

* **10–25** = Light
* **40–65** = Moderate
* **65+** = Heavy

Includes:

* Refresh Traffic button
* Auto-refresh every 15 minutes
* Snapshot history storage
* Countdown timer

---

## 📈 Smart Prediction Engine

Predicts the **next hour** traffic condition using:

* Current congestion score
* Historical traffic snapshots
* Delay patterns
* Route trends
* Traffic direction changes
* Confidence scoring

Outputs:

* Low / Medium / High Risk
* ETA Impact
* Confidence %
* Recommendation

---

## 👥 Estimated Passenger Volume

Metro Manila weighted estimation using:

* Jeepney routes
* Bus routes
* LRT lines
* MRT lines
* Stop density
* Population density multiplier
* Live congestion multiplier

---

## 🛣 Route Analytics (Data Page)

Allows route-level inspection.

Features:

* Searchable Route Selector
* Selected Route on Map
* Route Stops
* Route Lines
* Route Traffic Summary
* Route Predictions
* Dataset Counts
* Routing Status

---

## 🧭 Trip Planner

Google Maps style transit planner using GTFS.

Features:

* Select origin and destination
* Searchable stop selectors
* Swap stops
* Suggested route
* Transfers
* Step-by-step directions
* Auto-fit map bounds
* Fully responsive mobile UI

---

## 👤 User Management

Admin features:

* Add User
* Delete User
* Change Role
* Viewer / Admin roles
* Google OAuth
* Email/Password Login

---

# 🗃 Data Sources

## GTFS Files

Loaded from `/public/gtfs`

Includes:

* routes.txt
* stops.txt
* trips.txt
* shapes.txt
* stop_times.txt
* agency.txt
* calendar.txt
* frequencies.txt

## Live Traffic

TomTom API

## Custom Data

MySQL Admin Data

---

# 🔄 Snapshot System

Runs every 15 minutes using `node-cron`

Generates:

* traffic snapshots
* history rows
* trend analytics

Frontend label:

Next auto refresh in MM:SS

---

# 🎨 UI Design

Theme:

* Dark blue professional dashboard
* Responsive layout
* Mobile top nav
* Desktop collapsible sidebar
* Hover labels
* Header GIF banner
* Footer visible
* No overflow issues

---

# 📁 Important Files

## Frontend

* src/pages/Dashboard.jsx
* src/pages/Data.jsx
* src/pages/TripPlanner.jsx
* src/components/Layout.jsx
* src/components/dashboard/DashboardMap.jsx
* src/components/dashboard/DashboardToolbar.jsx
* src/components/dashboard/TripPlannerPanel.jsx
* src/hooks/useTrafficData.js
* src/hooks/useCurrentPrediction.js
* src/App.css
* src/index.css

## Backend

* server.js
* routes/*
* cron jobs
* traffic snapshot services

---

# ⚙️ Setup

## Install Frontend

```bash
npm install
npm run dev
```

## Install Backend

```bash
npm install
npm run dev
```

---

# 🔐 Environment Variables

## Frontend (.env)

```env
VITE_API_BASE_URL=
VITE_TOMTOM_API_KEY=
```

## Backend (.env)

```env
PORT=
MYSQLHOST=
MYSQLPORT=
MYSQLUSER=
MYSQLPASSWORD=
MYSQLDATABASE=
FRONTEND_URL=https://citybloop.com
GOOGLE_CALLBACK_URL=https://citybloop.com/api/auth/google/callback
```

---

# 🚀 Deployment

## Vercel Rewrite

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-backend.onrender.com/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

# 🧠 Future Improvements

* Real commuter demand model
* Heatmaps
* Vehicle GPS integration
* ETA by route
* Incident detection
* AI anomaly alerts
* Government dashboard mode
* Offline mobile app

---

# 👨‍💻 Developer Notes

Built as a Computer Engineering capstone / thesis style project focused on solving Metro Manila public transportation visibility and analytics problems.

---

# 📄 License

For academic and educational use.
