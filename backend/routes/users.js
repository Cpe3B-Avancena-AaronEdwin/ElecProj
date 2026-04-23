import express from "express";
import crypto from "crypto";
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
    displayName: row.display_name || row.full_name || row.username || "",
    fullName: row.full_name || row.display_name || "",
    photoURL: row.photo_url || "",
    role: row.role || "viewer",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function normalizeUsername(username = "") {
  return String(username).trim().toLowerCase().replace(/\s+/g, "");
}

function randomUid() {
  return `user_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function findUserByUid(uid) {
  if (!uid) return null;
  const [rows] = await pool.query("SELECT * FROM users WHERE uid = ? LIMIT 1", [
    uid,
  ]);
  return rows[0] || null;
}

async function findUserById(id) {
  if (!id) return null;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;

  const [rows] = await pool.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
    numericId,
  ]);
  return rows[0] || null;
}

async function resolveUserByIdOrUid(value) {
  const byId = await findUserById(value);
  if (byId) return byId;

  const byUid = await findUserByUid(String(value).trim());
  if (byUid) return byUid;

  return null;
}

async function ensureUniqueUsername(baseUsername, excludeUid = null) {
  let username = normalizeUsername(baseUsername) || "user";
  let candidate = username;
  let counter = 1;

  while (true) {
    let rows;
    if (excludeUid) {
      [rows] = await pool.query(
        "SELECT uid FROM users WHERE username = ? AND uid <> ? LIMIT 1",
        [candidate, excludeUid]
      );
    } else {
      [rows] = await pool.query(
        "SELECT uid FROM users WHERE username = ? LIMIT 1",
        [candidate]
      );
    }

    if (!rows.length) return candidate;

    candidate = `${username}${counter}`;
    counter += 1;
  }
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const row = await findUserByUid(req.user.uid);

    if (!row) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(mapUser(row));
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
      `SELECT *
       FROM users
       ORDER BY COALESCE(display_name, full_name, username, email) ASC`
    );

    res.json(rows.map(mapUser));
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const displayName = String(req.body.displayName || "").trim();
    const fullName = String(req.body.fullName || displayName).trim();
    const requestedRole = String(req.body.role || "viewer")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    if (!displayName) {
      return res.status(400).json({ error: "Display name is required." });
    }

    const allowedRoles = ["viewer", "operator", "admin"];
    const role = allowedRoles.includes(requestedRole) ? requestedRole : "viewer";

    const [existingEmailRows] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingEmailRows.length) {
      return res.status(409).json({ error: "Email is already in use." });
    }

    const usernameBase = email.includes("@")
      ? email.split("@")[0]
      : displayName || "user";

    const username = await ensureUniqueUsername(usernameBase);
    const uid = randomUid();

    await pool.query(
      `INSERT INTO users
      (uid, full_name, username, email, password_hash, photo_url, role, auth_provider, google_id, display_name, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uid,
        fullName,
        username,
        email,
        null,
        "",
        role,
        "admin_created",
        null,
        displayName,
        null,
      ]
    );

    const created = await findUserByUid(uid);

    res.status(201).json({
      message: "User created successfully.",
      user: mapUser(created),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = String(req.params.id || "").trim();
    const targetUser = await resolveUserByIdOrUid(requestedId);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isSelf =
      req.user.uid === targetUser.uid || Number(req.user.id) === Number(targetUser.id);

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    res.json(mapUser(targetUser));
  } catch (error) {
    next(error);
  }
});

router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = String(req.params.id || "").trim();
    const existing = await resolveUserByIdOrUid(requestedId);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const isSelf =
      req.user.uid === existing.uid || Number(req.user.id) === Number(existing.id);

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    const displayName =
      req.body.displayName !== undefined
        ? String(req.body.displayName).trim()
        : existing.display_name || "";

    const fullName =
      req.body.fullName !== undefined
        ? String(req.body.fullName).trim()
        : existing.full_name || displayName || "";

    const rawUsername =
      req.body.username !== undefined
        ? String(req.body.username).trim()
        : existing.username || "";

    const photoURL =
      req.body.photoURL !== undefined
        ? String(req.body.photoURL).trim()
        : existing.photo_url || "";

    const email =
      req.body.email !== undefined
        ? String(req.body.email).trim().toLowerCase()
        : existing.email || "";

    let role = existing.role || "viewer";
    if (!isSelf && req.user.role === "admin" && req.body.role !== undefined) {
      const requestedRole = String(req.body.role).trim().toLowerCase();
      if (["viewer", "operator", "admin"].includes(requestedRole)) {
        role = requestedRole;
      }
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const username = rawUsername
      ? await ensureUniqueUsername(rawUsername, existing.uid)
      : await ensureUniqueUsername(
          email.split("@")[0] || displayName || "user",
          existing.uid
        );

    const [usernameConflictRows] = await pool.query(
      "SELECT uid FROM users WHERE username = ? AND uid <> ? LIMIT 1",
      [username, existing.uid]
    );

    if (usernameConflictRows.length) {
      return res.status(409).json({ error: "Username is already taken." });
    }

    const [emailConflictRows] = await pool.query(
      "SELECT uid FROM users WHERE email = ? AND uid <> ? LIMIT 1",
      [email, existing.uid]
    );

    if (emailConflictRows.length) {
      return res.status(409).json({ error: "Email is already in use." });
    }

    await pool.query(
      `UPDATE users
       SET email = ?,
           username = ?,
           display_name = ?,
           full_name = ?,
           photo_url = ?,
           role = ?,
           updated_at = ?
       WHERE uid = ?`,
      [email, username, displayName, fullName, photoURL, role, new Date(), existing.uid]
    );

    const updated = await findUserByUid(existing.uid);

    res.json({
      message: "User updated successfully",
      user: mapUser(updated),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = String(req.params.id || "").trim();
    const targetUser = await resolveUserByIdOrUid(requestedId);

    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const isSelf =
      req.user.uid === targetUser.uid || Number(req.user.id) === Number(targetUser.id);

    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden." });
    }

    await pool.query("DELETE FROM users WHERE uid = ?", [targetUser.uid]);

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;