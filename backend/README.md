# Titan HRMS Backend

This backend is built for the existing Titan HRMS frontend. It supports:

- Login and JWT auth
- Employees, roles, departments, designations
- Attendance check-in/check-out
- Leave requests and approval/rejection
- Payroll generation and payment status
- Recruitment jobs and candidates
- Settings and shift management
- Private chat with Socket.IO
- Dashboard stats

## Local setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Default login:

```txt
Email: admin@titanhrms.com
Password: admin123
```

Start the frontend in another terminal:

```bash
npm install
npm run dev
```

The frontend proxies `/api` and `/socket.io` to `http://localhost:5000`.

## Production setup on one server

From the project root:

```bash
npm install
npm run build
cd backend
cp .env.example .env
npm install
npm run build
```

Set these values in `backend/.env`:

```txt
NODE_ENV=production
PORT=5000
JWT_SECRET=use-a-strong-random-secret
COOKIE_SECURE=true
FRONTEND_DIST_PATH=../dist
CORS_ORIGIN=https://your-domain.com
DB_PATH=./data/hrms.db
```

Then run:

```bash
npm start
```

The backend will serve both API and the built React frontend.

## Important production notes

SQLite is included because it is simple and works immediately for a single-server deployment. For multi-server or high-traffic HRMS usage, migrate the schema to PostgreSQL before going live.

Always change `JWT_SECRET`, `ADMIN_PASSWORD`, and use HTTPS in production.
