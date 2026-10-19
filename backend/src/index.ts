import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Simple register endpoint (no validation / hashing omitted for brevity)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: "missing" });
    const user = await prisma.user.create({ data: { name, email, passwordHash: password, role } });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// QR Login: create token and return payload to render as QR
app.post("/api/auth/qr/create", async (req, res) => {
  try {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
    const qr = await prisma.qrSession.create({ data: { token, expiresAt } });
    // payload encoded in QR: we can just send token string; frontend will encode as JSON if needed
    res.json({ token: qr.token, expiresAt: qr.expiresAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// Mobile app calls this to confirm the QR (must be authenticated on mobile side)
app.post("/api/auth/qr/confirm", async (req, res) => {
  try {
    // In real app verify Authorization header token from mobile
    const { token, mobileUserId } = req.body;
    if (!token || !mobileUserId) return res.status(400).json({ error: "missing" });
    const session = await prisma.qrSession.findUnique({ where: { token } });
    if (!session) return res.status(404).json({ error: "not_found" });
    if (session.used) return res.status(400).json({ error: "already_used" });
    if (session.expiresAt < new Date()) return res.status(400).json({ error: "expired" });
    // link session to user (mobileUserId should map to existing user id)
    await prisma.qrSession.update({ where: { token }, data: { used: true, userId: mobileUserId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// Web client polls this to see if QR was confirmed
app.get("/api/auth/qr/status", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    if (!token) return res.status(400).json({ error: "missing" });
    const session = await prisma.qrSession.findUnique({ where: { token } });
    if (!session) return res.status(404).json({ status: "pending" });
    if (session.used && session.userId) {
      // create a session/token for web (for MVP just return user info)
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      return res.json({ status: "confirmed", user });
    }
    if (session.expiresAt < new Date()) return res.json({ status: "expired" });
    res.json({ status: "pending" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
