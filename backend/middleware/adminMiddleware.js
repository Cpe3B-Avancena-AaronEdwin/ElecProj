import { db } from "../firebaseAdmin.js";

export async function requireAdmin(req, res, next) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        error: "Unauthorized.",
      });
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({
        error: "Forbidden. User profile not found.",
      });
    }

    const userData = userDoc.data() || {};

    if (userData.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden. Admin access required.",
      });
    }

    req.userProfile = {
      id: userDoc.id,
      ...userData,
    };

    next();
  } catch (error) {
    next(error);
  }
}