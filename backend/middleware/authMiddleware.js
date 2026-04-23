import jwt from "jsonwebtoken";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "citybloop_token";
const JWT_SECRET = process.env.JWT_SECRET || "change-this-in-production";

export async function getAuthUserFromRequest(req) {
  try {
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const authHeader = req.headers.authorization || "";
    const [scheme, bearerToken] = authHeader.split(" ");

    const token =
      cookieToken || (scheme === "Bearer" && bearerToken ? bearerToken : null);

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      uid: decoded.uid,
      email: decoded.email || "",
      name: decoded.name || "",
      role: decoded.role || "viewer",
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  const authUser = await getAuthUserFromRequest(req);

  if (!authUser?.uid) {
    return res.status(401).json({
      error: "Unauthorized.",
    });
  }

  req.user = authUser;
  next();
}