import express from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function mapUser(row) {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email || "",
    username: row.username || "",
    displayName: row.display_name || "",
    fullName: row.full_name || "",
    photoURL: row.photo_url || "",
    role: row.role || "viewer",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function normalizeUsername(username = "") {
  return String(username).trim().toLowerCase();
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE uid = ? LIMIT 1",
      [req.user.uid]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.get("/lookup/by-username/:username", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.params.username);

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Username not found" });
    }

    res.json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users ORDER BY display_name ASC"
    );
    res.json(rows.map(mapUser));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE uid = ? LIMIT 1",
      [requestedId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(mapUser(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    const [existingRows] = await pool.query(
      "SELECT * FROM users WHERE uid = ? LIMIT 1",
      [requestedId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = existingRows[0];

    const displayName =
      req.body.displayName !== undefined
        ? String(req.body.displayName).trim()
        : existing.display_name;

    const fullName =
      req.body.fullName !== undefined
        ? String(req.body.fullName).trim()
        : existing.full_name;

    const username =
      req.body.username !== undefined
        ? normalizeUsername(req.body.username)
        : existing.username;

    const photoURL =
      req.body.photoURL !== undefined
        ? String(req.body.photoURL).trim()
        : existing.photo_url;

    const email =
      req.body.email !== undefined
        ? String(req.body.email).trim().toLowerCase()
        : existing.email;

    let role = existing.role;
    if (!isSelf && req.user.role === "admin" && req.body.role !== undefined) {
      role = String(req.body.role).trim();
    }

    if (username) {
      const [conflictRows] = await pool.query(
        "SELECT uid FROM users WHERE username = ? AND uid <> ? LIMIT 1",
        [username, requestedId]
      );

      if (conflictRows.length) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    if (email) {
      const [emailConflictRows] = await pool.query(
        "SELECT uid FROM users WHERE email = ? AND uid <> ? LIMIT 1",
        [email, requestedId]
      );

      if (emailConflictRows.length) {
        return res.status(409).json({ error: "Email is already in use." });
      }
    }

    await pool.query(
      `UPDATE users
       SET email = ?, username = ?, display_name = ?, full_name = ?, photo_url = ?, role = ?, updated_at = ?
       WHERE uid = ?`,
      [email, username, displayName, fullName, photoURL, role, new Date(), requestedId]
    );

    res.json({
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    const [rows] = await pool.query(
      "SELECT uid FROM users WHERE uid = ? LIMIT 1",
      [requestedId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    await pool.query("DELETE FROM users WHERE uid = ?", [requestedId]);

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;