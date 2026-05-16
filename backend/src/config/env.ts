import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "dev-only-change-me";

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("change-this"))) {
  throw new Error("JWT_SECRET must be set to a strong value in production.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 5000),
  appUrl: process.env.APP_URL || "http://localhost:5173",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  dbPath: process.env.DB_PATH || "./data/hrms.db",
  adminEmail: process.env.ADMIN_EMAIL || "admin@titanhrms.com",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  defaultEmployeePassword: process.env.DEFAULT_EMPLOYEE_PASSWORD || "welcome123",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  frontendDistPath: process.env.FRONTEND_DIST_PATH || "",
};
