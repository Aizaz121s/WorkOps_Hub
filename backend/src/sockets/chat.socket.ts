import type http from "http";
import { Server } from "socket.io";
import type Database from "better-sqlite3";
import { env } from "../config/env.js";

export function setupChatSocket(httpServer: http.Server, db: Database.Database) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  const employeeToSockets = new Map<number, Set<string>>();
  const socketToEmployee = new Map<string, number>();
  const onlineEmployees = new Set<number>();

  function markOnline(employeeId: number, socketId: string) {
    if (!employeeToSockets.has(employeeId)) {
      employeeToSockets.set(employeeId, new Set());
    }

    employeeToSockets.get(employeeId)!.add(socketId);
    socketToEmployee.set(socketId, employeeId);
    onlineEmployees.add(employeeId);

    io.emit("status-update", { employeeId, status: "Active" });
    io.emit("online-users", Array.from(onlineEmployees));
  }

  function markOffline(socketId: string) {
    const employeeId = socketToEmployee.get(socketId);
    if (!employeeId) return;

    const sockets = employeeToSockets.get(employeeId);
    sockets?.delete(socketId);
    socketToEmployee.delete(socketId);

    if (!sockets || sockets.size === 0) {
      employeeToSockets.delete(employeeId);
      onlineEmployees.delete(employeeId);
      io.emit("status-update", { employeeId, status: "Offline" });
      io.emit("online-users", Array.from(onlineEmployees));
    }
  }

  io.on("connection", (socket) => {
    socket.on("identify", (employeeId) => {
      const empId = Number(employeeId);
      if (!Number.isFinite(empId)) return;

      socket.join(`emp_${empId}`);
      markOnline(empId, socket.id);
    });

    socket.on("send-private-message", (data) => {
      const senderId = Number(data?.sender_id);
      const receiverId = Number(data?.receiver_id);
      const content = String(data?.content || "").trim();

      if (!senderId || !receiverId || !content) return;

      try {
        const result = db.prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)")
          .run(senderId, receiverId, content);

        const message = {
          id: result.lastInsertRowid,
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          created_at: new Date().toISOString(),
        };

        io.to(`emp_${senderId}`).to(`emp_${receiverId}`).emit("receive-private-message", message);
      } catch (error) {
        console.error("Socket message save failed", error);
      }
    });

    socket.on("typing", (data) => {
      const receiverId = Number(data?.receiver_id);
      if (!receiverId) return;
      io.to(`emp_${receiverId}`).emit("user-typing", data);
    });

    socket.on("call-status", (data) => {
      const employeeId = Number(data?.employeeId);
      if (!employeeId) return;
      io.emit("status-update", { employeeId, status: data?.status || "Active" });
    });

    socket.on("disconnect", () => {
      markOffline(socket.id);
    });
  });

  return io;
}
