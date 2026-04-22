import express from "express";
import { db } from "../firebaseAdmin.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

function normalizeValue(value) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return value;
}

function normalizeDoc(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, normalizeValue(value)])
    ),
  };
}

function normalizeUsername(username = "") {
  return String(username).trim().toLowerCase();
}

function buildUserPayload(body = {}, existing = {}) {
  const displayName =
    body.displayName !== undefined
      ? String(body.displayName).trim()
      : existing.displayName || "";

  const fullName =
    body.fullName !== undefined
      ? String(body.fullName).trim()
      : existing.fullName || displayName || "";

  const username =
    body.username !== undefined
      ? normalizeUsername(body.username)
      : existing.username || "";

  return {
    uid: body.uid !== undefined ? String(body.uid).trim() : existing.uid || "",
    email:
      body.email !== undefined
        ? String(body.email).trim()
        : existing.email || "",
    displayName,
    fullName,
    username,
    photoURL:
      body.photoURL !== undefined
        ? String(body.photoURL).trim()
        : existing.photoURL || "",
    role:
      body.role !== undefined
        ? String(body.role).trim()
        : existing.role || "viewer",
    sessions: Array.isArray(body.sessions)
      ? body.sessions
      : Array.isArray(existing.sessions)
      ? existing.sessions
      : [],
    lastLoginAt:
      body.lastLoginAt !== undefined ? body.lastLoginAt : existing.lastLoginAt || null,
    updatedAt: new Date(),
    createdAt: existing.createdAt || new Date(),
  };
}

// GET current logged-in user profile
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const docSnap = await db.collection("users").doc(req.user.uid).get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(normalizeDoc(docSnap));
  } catch (error) {
    next(error);
  }
});

// GET user by username
router.get("/lookup/by-username/:username", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.params.username);

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const snapshot = await db
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: "Username not found" });
    }

    res.json(normalizeDoc(snapshot.docs[0]));
  } catch (error) {
    next(error);
  }
});

// GET all users - admin only
router.get("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const snapshot = await db.collection("users").orderBy("displayName", "asc").get();
    const users = snapshot.docs.map(normalizeDoc);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// GET user by uid/doc id
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    if (!isSelf) {
      const requesterDoc = await db.collection("users").doc(req.user.uid).get();
      const requesterRole = requesterDoc.exists ? requesterDoc.data()?.role : null;

      if (requesterRole !== "admin") {
        return res.status(403).json({ error: "Forbidden." });
      }
    }

    const docSnap = await db.collection("users").doc(requestedId).get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(normalizeDoc(docSnap));
  } catch (error) {
    next(error);
  }
});

// CREATE manual user doc - admin only
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, displayName, role, fullName, username, photoURL, uid } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({
        error: "email and displayName are required",
      });
    }

    const normalizedUsername = normalizeUsername(username || "");
    if (normalizedUsername) {
      const usernameSnapshot = await db
        .collection("users")
        .where("username", "==", normalizedUsername)
        .limit(1)
        .get();

      if (!usernameSnapshot.empty) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    const payload = {
      uid: uid ? String(uid).trim() : "",
      email: String(email).trim(),
      displayName: String(displayName).trim(),
      fullName: fullName ? String(fullName).trim() : String(displayName).trim(),
      username: normalizedUsername,
      photoURL: photoURL ? String(photoURL).trim() : "",
      role: role ? String(role).trim() : "viewer",
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    const docRef = await db.collection("users").add(payload);

    res.status(201).json({
      message: "User created successfully",
      id: docRef.id,
    });
  } catch (error) {
    next(error);
  }
});

// UPSERT by uid - used after auth login/register
router.post("/upsert/:uid", async (req, res, next) => {
  try {
    const uid = String(req.params.uid).trim();

    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    const ref = db.collection("users").doc(uid);
    const existingSnap = await ref.get();
    const existing = existingSnap.exists ? existingSnap.data() : {};

    const payload = buildUserPayload(
      {
        ...req.body,
        uid,
        lastLoginAt: new Date(),
      },
      existing
    );

    if (payload.username) {
      const usernameSnapshot = await db
        .collection("users")
        .where("username", "==", payload.username)
        .limit(5)
        .get();

      const conflict = usernameSnapshot.docs.find((doc) => doc.id !== uid);
      if (conflict) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    await ref.set(payload, { merge: true });

    res.json({
      message: existingSnap.exists
        ? "User updated successfully"
        : "User created successfully",
      user: {
        id: uid,
        ...Object.fromEntries(
          Object.entries(payload).map(([key, value]) => [key, normalizeValue(value)])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE user by id - self or admin
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    let requesterRole = null;
    if (!isSelf) {
      const requesterDoc = await db.collection("users").doc(req.user.uid).get();
      requesterRole = requesterDoc.exists ? requesterDoc.data()?.role : null;

      if (requesterRole !== "admin") {
        return res.status(403).json({ error: "Forbidden." });
      }
    }

    const ref = db.collection("users").doc(requestedId);
    const existingSnap = await ref.get();

    if (!existingSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = existingSnap.data();
    const payload = buildUserPayload(req.body, existing);

    if (isSelf && requesterRole !== "admin") {
      payload.role = existing.role || "viewer";
    }

    if (payload.username) {
      const usernameSnapshot = await db
        .collection("users")
        .where("username", "==", payload.username)
        .limit(5)
        .get();

      const conflict = usernameSnapshot.docs.find((doc) => doc.id !== requestedId);
      if (conflict) {
        return res.status(409).json({ error: "Username is already taken." });
      }
    }

    await ref.update(payload);

    res.json({
      message: "User updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// DELETE user doc - self or admin
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const isSelf = req.user.uid === requestedId;

    if (!isSelf) {
      const requesterDoc = await db.collection("users").doc(req.user.uid).get();
      const requesterRole = requesterDoc.exists ? requesterDoc.data()?.role : null;

      if (requesterRole !== "admin") {
        return res.status(403).json({ error: "Forbidden." });
      }
    }

    const ref = db.collection("users").doc(requestedId);
    const existingSnap = await ref.get();

    if (!existingSnap.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await ref.delete();

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export default router;