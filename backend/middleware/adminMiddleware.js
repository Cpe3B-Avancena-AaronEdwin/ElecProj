import { pool } from "../db.js";

export async function requireAdmin(req, res, next) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const [rows] = await pool.query(
      "SELECT id, uid, email, username, display_name, full_name, photo_url, role, created_at, updated_at, last_login_at FROM users WHERE uid = ? LIMIT 1",
      [uid]
    );

    if (!rows.length) {
      return res.status(403).json({
        error: "Forbidden. User profile not found.",
      });
    }

    const user = rows[0];

    if (user.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Admin access required.",
      });
    }

    req.userProfile = user;
    next();
  } catch (error) {
    next(error);
  }
}