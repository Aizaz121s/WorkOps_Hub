import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { employeesRouter } from "./routes/employees.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { leavesRouter } from "./routes/leaves.routes.js";
import { shiftsRouter } from "./routes/shifts.routes.js";
import { recruitmentRouter } from "./routes/recruitment.routes.js";
import { payrollRouter } from "./routes/payroll.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { messagesRouter } from "./routes/messages.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { metaRouter } from "./routes/meta.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";
import {
  authenticate,
  canManageEmployees,
  canManageLeaves,
  canManageAttendance,
  isSuperAdmin,
  getSetting,
} from "./middleware/auth.js";
export function createApp() {
  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use(cookieParser());

  app.use("/api", healthRouter);
  app.use("/api/auth", authRouter);
  app.get("/api/permissions", authenticate, (req, res) => {
  return res.json({
    success: true,
   data: {
  canManageEmployees: canManageEmployees(req),
  canManageLeaves: canManageLeaves(req),
  canManageAttendance: canManageAttendance(req),

  canGrantHrEmployeeManagement: isSuperAdmin(req),

  allowHrEmployeeManagement:
    getSetting("allow_hr_employee_management", "false") === "true",

  allowHrLeaveManagement:
    getSetting("allow_hr_leave_management", "false") === "true",

  allowHrAttendanceManagement:
    getSetting("allow_hr_attendance_management", "false") === "true",
},
  });
});
  app.use("/api/employees", employeesRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/leaves", leavesRouter);
  app.use("/api/shifts", shiftsRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api", recruitmentRouter);
  app.use("/api", metaRouter);

  

  if (env.frontendDistPath) {
    const distPath = path.resolve(process.cwd(), env.frontendDistPath);
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
