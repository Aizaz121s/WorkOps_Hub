# Titan HRMS Enterprise Employee Management

This project now includes a complete backend in the `backend/` folder and the existing React/Vite frontend.

## What is included

- Full Express TypeScript backend
- SQLite database with schema migration and seed data
- JWT login/authentication
- Employees, roles, departments, designations
- Attendance check-in/check-out
- Leave request and approval flow
- Payroll generation and payment status
- Recruitment jobs and candidates
- Settings and shift management
- Private real-time chat using Socket.IO
- Dashboard stats API
- Production static frontend serving support
- Dockerfile and docker-compose file for backend deployment

## Local development

Terminal 1:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Terminal 2, from project root:

```bash
npm install
npm run dev
```

Open the frontend URL shown by Vite. The frontend will proxy `/api` and `/socket.io` requests to `http://localhost:5000`.

Default login:

```txt
Email: admin@titanhrms.com
Password: admin123
```

## Production on one server

From the project root:

```bash
npm install
npm run build
cd backend
cp .env.example .env
npm install
npm run build
```

Update `backend/.env`:

```txt
NODE_ENV=production
PORT=5000
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECURE=true
CORS_ORIGIN=https://your-domain.com
FRONTEND_DIST_PATH=../dist
DB_PATH=./data/hrms.db
```

Run:

```bash
npm start
```

The backend will serve the React build and all API routes from the same port.

## Docker backend run

```bash
cd backend
cp .env.example .env
cd ..
docker compose up --build -d
```

For real HRMS production with multiple servers, use PostgreSQL instead of SQLite. This backend is ready for a single-server deployment and can be migrated later.
