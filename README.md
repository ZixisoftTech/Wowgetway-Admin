# Wow Gateway - Super Admin Panel

Wow Gateway is a premium travel, hospitality, homestay, hotel, ride booking, sightseeing, tourism, and service command center built on the MERN stack.

---

## 📁 Repository Structure

```
Wow-Getway-2026/
├── backend/
│   ├── .env                 # Environment variables
│   ├── server.js            # Express server entry point
│   ├── routes.js            # API endpoint routes
│   ├── models.js            # Mongoose schemas (Booking, Employee, Homestay)
│   ├── seed.js              # Database population script
│   └── package.json         # Node.js backend configuration
│
├── frontend/
│   ├── index.html           # Document shell
│   ├── vite.config.js       # Vite bundler options
│   ├── postcss.config.js    # Tailwind PostCSS configuration
│   ├── src/
│   │   ├── main.jsx         # Client mount entry point
│   │   ├── App.jsx          # Providers & navigation routing
│   │   ├── index.css        # Global CSS + Tailwind v4 theme mapping
│   │   ├── store/           # Redux Toolkit state slice
│   │   ├── hooks/           # React Query server fetching hooks
│   │   ├── pages/           # Admin page views (Dashboard)
│   │   └── components/
│   │       ├── layout/      # Sidebar, Header, AppLayout
│   │       └── widgets/     # MetricCard, Charts, tables
│   └── package.json         # React client configuration
│
└── project_memory.md        # Permanent design & stack guidelines
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Local (defaulting to port 27017) or MongoDB Atlas connection string (optional; server falls back to memory storage automatically if connection fails)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the `.env` file (port and DB connection default settings):
   ```ini
   PORT=5005
   MONGO_URI=mongodb://127.0.0.1:27017/wow_gateways
   ```
4. Seed mock database entries (requires active local MongoDB):
   ```bash
   npm run seed
   ```
5. Launch the Node development server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Launch the Vite client:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to: [http://localhost:5173](http://localhost:5173)

---

## 📊 Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/dashboard/summary` | Yields total bookings, employee aggregates, and today checkins/checkout records. |
| **GET** | `/api/dashboard/charts` | Fetches monthly bookings, pie details, and weekly income data points. |
| **GET** | `/api/dashboard/employees` | Retrieves top 5 employee sales and booking statistics. |
| **GET** | `/api/dashboard/homestays` | Returns top 5 property occupancy ratios and bookings counts. |
| **GET** | `/health` | Server uptime and DB connection diagnostics. |

---

## 📄 Design Standards
All visual elements are configured using **Tailwind CSS v4** themes mapping. Standard HSL palettes matching Airbnb and Stripe's design systems are defined in [index.css](file:///Users/chetansmac/Antigravity/Wow-Getway-2026/frontend/src/index.css).
