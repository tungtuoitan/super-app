const jwt = require("jsonwebtoken");

// Checks the access token on every API request; refreshes it from the refresh cookie when it has expired.
module.exports = function requireAuth(options = {}) {
  return async function (req, res, next) {
    if (options.public && options.public.includes(req.path)) return next();

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "missing_token" });

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      if (err.name !== "TokenExpiredError") {
        return res.status(401).json({ error: "invalid_token" });
      }
    }

    // Access token expired: try the refresh cookie once
    const refresh = req.cookies && req.cookies.refresh_token;
    if (!refresh) return res.status(401).json({ error: "session_expired" });

    const session = await sessions.findByRefreshToken(refresh);
    if (!session || session.revokedAt || session.expiresAt < Date.now()) {
      res.clearCookie("refresh_token");
      return res.status(401).json({ error: "session_expired" });
    }

    const fresh = jwt.sign({ sub: session.userId, role: session.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.setHeader("X-New-Access-Token", fresh);
    req.user = { sub: session.userId, role: session.role };
    sessions.touch(session.id).catch(() => {}); // fire and forget
    next();
  };
};
