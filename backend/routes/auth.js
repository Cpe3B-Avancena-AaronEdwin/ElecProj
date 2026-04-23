import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../db.js";
import {
  requireAuth,
  getAuthUserFromRequest,
} from "../middleware/authMiddleware.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "citybloop_token";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/api/auth/google/callback";

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

if (
  googleClientId &&
  googleClientSecret &&
  !passport._elecprojGoogleConfigured
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );

  passport._elecprojGoogleConfigured = true;
}

function normalizeUsername(username = "") {
  return String(username).trim().toLowerCase();
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function randomUid() {
  return `user_${crypto.randomUUID().replace(/-/g, "")}`;
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    uid: row.uid,
    email: row.email || "",
    username: row.username || "",
    displayName: row.display_name || row.full_name || "",
    fullName: row.full_name || row.display_name || "",
    photoURL: row.photo_url || "",
    role: row.role || "viewer",
    googleId: row.google_id || "",
    authProviders: [
      ...(row.password_hash ? ["password"] : []),
      ...(row.google_id ? ["google.com"] : []),
    ],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function buildProviderData(user) {
  const providers = Array.isArray(user.authProviders) ? user.authProviders : [];
  return providers.map((providerId) => ({ providerId }));
}

function buildAuthResponse(user) {
  return {
    ...user,
    providerData: buildProviderData(user),
  };
}

function setAuthCookie(res, user) {
  const token = jwt.sign(
    {
      uid: user.uid,
      email: user.email || "",
      name: user.displayName || user.fullName || "",
      role: user.role || "viewer",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  });
}

async function findUserByUid(uid) {
  const [rows] = await pool.query("SELECT * FROM users WHERE uid = ? LIMIT 1", [
    uid,
  ]);
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const [rows] = await pool.query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [normalized]
  );
  return rows[0] || null;
}

async function findUserByUsername(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const [rows] = await pool.query(
    "SELECT * FROM users WHERE username = ? LIMIT 1",
    [normalized]
  );
  return rows[0] || null;
}

async function findUserByGoogleId(googleId) {
  if (!googleId) return null;

  const [rows] = await pool.query(
    "SELECT * FROM users WHERE google_id = ? LIMIT 1",
    [String(googleId)]
  );
  return rows[0] || null;
}

async function ensureUsernameAvailable(username, ignoreUid = "") {
  const existing = await findUserByUsername(username);
  if (existing && existing.uid !== ignoreUid) {
    throw new Error("Username is already taken.");
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const username = normalizeUsername(req.body.username || "");
    const email = normalizeEmail(req.body.email || "");
    const password = String(req.body.password || "");

    if (!fullName) {
      return res.status(400).json({ error: "Full name is required." });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required." });
    }

    if (username.includes("@")) {
      return res.status(400).json({ error: "Username cannot contain @." });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: "Email is already in use." });
    }

    await ensureUsernameAvailable(username);

    const uid = randomUid();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users
      (uid, email, username, display_name, full_name, photo_url, role, password_hash, google_id, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uid, email, username, fullName, fullName, "", "viewer", passwordHash, null, new Date()]
    );

    const user = mapUser(await findUserByUid(uid));
    setAuthCookie(res, user);

    res.status(201).json({
      message: "Account created successfully.",
      user: buildAuthResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    const password = String(req.body.password || "");

    if (!identifier) {
      return res.status(400).json({ error: "Email or username is required." });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const userRow = identifier.includes("@")
      ? await findUserByEmail(identifier)
      : await findUserByUsername(identifier);

    if (!userRow) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    if (!userRow.password_hash) {
      return res.status(400).json({
        error:
          "This account does not have password login enabled. Use Google sign-in or add a password from Profile.",
      });
    }

    const matches = await bcrypt.compare(password, userRow.password_hash);

    if (!matches) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    await pool.query(
      "UPDATE users SET last_login_at = ?, updated_at = ? WHERE uid = ?",
      [new Date(), new Date(), userRow.uid]
    );

    const user = mapUser(await findUserByUid(userRow.uid));
    setAuthCookie(res, user);

    res.json({
      message: "Login successful.",
      user: buildAuthResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out successfully." });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userRow = await findUserByUid(req.user.uid);

    if (!userRow) {
      clearAuthCookie(res);
      return res.status(404).json({ error: "User not found." });
    }

    const user = mapUser(userRow);

    res.json({
      user: buildAuthResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/providers", requireAuth, async (req, res, next) => {
  try {
    const userRow = await findUserByUid(req.user.uid);

    if (!userRow) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = mapUser(userRow);

    res.json({
      providers: Array.isArray(user.authProviders) ? user.authProviders : [],
    });
  } catch (error) {
    next(error);
  }
});

router.get("/google", (req, res, next) => {
  if (!googleClientId || !googleClientSecret) {
    return res
      .status(500)
      .json({ error: "Google OAuth is not configured on the backend." });
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err, profile) => {
    try {
      if (err) {
        console.error("Google callback error:", err);
        return next(err);
      }

      if (!profile) {
        return res.redirect(
          `${FRONTEND_URL}/login?error=${encodeURIComponent(
            "Google sign-in failed."
          )}`
        );
      }

      const googleId = profile.id || "";
      const email = normalizeEmail(profile.emails?.[0]?.value || "");
      const displayName = String(profile.displayName || "User").trim();
      const photoURL = String(profile.photos?.[0]?.value || "").trim();

      let userRow = (await findUserByGoogleId(googleId)) || null;

      if (!userRow && email) {
        userRow = await findUserByEmail(email);
      }

      if (userRow) {
        await pool.query(
          `UPDATE users
           SET google_id = ?, email = ?, display_name = ?, full_name = ?, photo_url = ?, last_login_at = ?, updated_at = ?
           WHERE uid = ?`,
          [
            googleId,
            userRow.email || email || "",
            userRow.display_name || displayName,
            userRow.full_name || displayName,
            userRow.photo_url || photoURL || "",
            new Date(),
            new Date(),
            userRow.uid,
          ]
        );
      } else {
        const uid = randomUid();
        const usernameBase = normalizeUsername(
          (email && email.split("@")[0]) || displayName || "user"
        );

        let username = usernameBase || `user${Date.now()}`;
        let counter = 1;
        while (await findUserByUsername(username)) {
          username = `${usernameBase || "user"}${counter}`;
          counter += 1;
        }

        await pool.query(
          `INSERT INTO users
          (uid, email, username, display_name, full_name, photo_url, role, password_hash, google_id, last_login_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uid,
            email || "",
            username,
            displayName,
            displayName,
            photoURL || "",
            "viewer",
            null,
            googleId,
            new Date(),
          ]
        );

        userRow = await findUserByUid(uid);
      }

      const user = mapUser(await findUserByUid(userRow.uid));
      setAuthCookie(res, user);

      return res.redirect(`${FRONTEND_URL}/dashboard`);
    } catch (error) {
      console.error("Google callback failure:", error);
      next(error);
    }
  })(req, res, next);
});

export default router;